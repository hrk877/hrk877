import assert from 'node:assert/strict'
import * as cp from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile, chmod, rm, access, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../app/api/talk/route.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

// Replace only the platform-specific audio tools; execute real subprocesses so
// shell expansion in the route would still create the marker and fail the test.
async function fixture(t, platform = 'darwin', fail = false) {
  const root = await mkdtemp(join(tmpdir(), 'talk-security-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bin = join(root, 'bin')
  const log = join(root, 'spoken.json')
  await mkdir(bin)
  const tool = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const name = path.basename(process.argv[1]);
const output = args[args.indexOf('-o') + 1];
if (name === 'say') {
  if (process.env.TALK_TEST_FAIL === '1') { console.error('private backend failure'); process.exit(1); }
  const text = args.includes('-f') ? fs.readFileSync(args[args.indexOf('-f') + 1], 'utf8') : args.at(-1);
  fs.writeFileSync(process.env.TALK_TEST_LOG, JSON.stringify(text));
  fs.writeFileSync(output, 'audio');
} else if (name === 'afconvert') {
  fs.writeFileSync(args.at(-1), 'wave');
} else {
  fs.writeFileSync(output, JSON.stringify({ mouthCues: [{ start: 0, end: 1, value: 'A' }], metadata: { duration: 1 } }));
}
`
  for (const name of ['say', 'afconvert', 'arch']) {
    await writeFile(join(bin, name), tool)
    await chmod(join(bin, name), 0o755)
  }
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, TALK_TEST_LOG: log, TALK_TEST_FAIL: fail ? '1' : '0' }
  const childProcess = {
    exec(command, options, callback) {
      if (typeof options === 'function') [callback, options] = [options, {}]
      return cp.exec(command, { ...options, env }, callback)
    },
    execFile(file, args, options, callback) {
      if (typeof options === 'function') [callback, options] = [options, {}]
      return cp.execFile(file, args, { ...options, env }, callback)
    },
  }
  const exports = {}
  runInNewContext(compiled, {
    exports, process: { cwd: () => root, platform }, console: { error() {} },
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: Response.json } }
      if (name === 'child_process' || name === 'node:child_process') return childProcess
      if (name === 'os' || name === 'node:os') return { tmpdir: () => root }
      return require(name)
    },
  })
  return { root, log, POST: exports.POST }
}

test('shell syntax is spoken literally without executing an injected command', async (t) => {
  const { root, log, POST } = await fixture(t)
  const marker = join(root, 'injected')
  const text = `日本語 $(printf injected > ${marker}) \\ \"quotes\" \`backticks\` ; --rate=1\nnext line`
  const response = await POST({ json: async () => ({ text }) })
  await assert.rejects(access(marker), { code: 'ENOENT' })
  assert.equal(response.status, 200)
  assert.equal(JSON.parse(await readFile(log, 'utf8')), text)
  const body = await response.json()
  assert.equal(body.audioBase64, Buffer.from('wave').toString('base64'))
  assert.equal(body.duration, 1)
  assert.deepEqual(body.mouthCues, [{ start: 0, end: 1, value: 'A' }])
  assert.deepEqual((await readdir(root)).sort(), ['bin', 'spoken.json'])
})

test('invalid JSON and non-string, empty, oversized or NUL text return 400', async (t) => {
  const { POST } = await fixture(t)
  for (const body of [null, {}, { text: 123 }, { text: '' }, { text: '  ' }, { text: 'x'.repeat(2001) }, { text: 'a\0b' }]) {
    assert.equal((await POST({ json: async () => body })).status, 400)
  }
  assert.equal((await POST({ json: async () => { throw new SyntaxError('invalid JSON') } })).status, 400)
})

test('unsupported hosts do not attempt to run macOS audio tools', async (t) => {
  const { POST, log } = await fixture(t, 'linux')
  assert.equal((await POST({ json: async () => ({ text: 'hello' }) })).status, 503)
  await assert.rejects(access(log), { code: 'ENOENT' })
})

test('leading flags and the 2000-character boundary remain literal speech', async (t) => {
  const { POST, log } = await fixture(t)
  for (const text of ['--output-file=/tmp/not-an-option', 'あ'.repeat(2000)]) {
    assert.equal((await POST({ json: async () => ({ text }) })).status, 200)
    assert.equal(JSON.parse(await readFile(log, 'utf8')), text)
  }
})

test('tool failures clean up temporary input and do not expose backend errors', async (t) => {
  const { POST, root } = await fixture(t, 'darwin', true)
  const response = await POST({ json: async () => ({ text: 'hello' }) })
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'audio generation failed' })
  assert.deepEqual(await readdir(root), ['bin'])
})
