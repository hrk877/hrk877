import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { fileURLToPath } from "node:url"
import test, { after, before } from "node:test"

const projectRoot = fileURLToPath(new URL("..", import.meta.url))
const port = 41877
const baseUrl = `http://127.0.0.1:${port}`

let server
let serverOutput = ""

function extractJsonLd(html) {
  return [...html.matchAll(
    /<script type="application\/ld\+json">([^<]+)<\/script>/g,
  )].map((match) => JSON.parse(match[1]))
}

async function waitForServer() {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before startup:\n${serverOutput}`)
    }

    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // The process is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for Next.js:\n${serverOutput}`)
}

before(async () => {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  )

  server.stdout.on("data", (chunk) => {
    serverOutput += chunk
  })
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk
  })

  await waitForServer()
})

after(async () => {
  if (server?.exitCode === null) {
    server.kill("SIGTERM")
    await once(server, "exit")
  }
})

test("keeps the rendered homepage title branded as 877hand", async () => {
  const html = await fetch(baseUrl).then((response) => response.text())

  assert.match(html, /<title>877hand｜Banana Hand<\/title>/)
  assert.doesNotMatch(html, /<title>[^<]*877finger/i)
})

test("renders 877finger as an alternate name for the homepage", async () => {
  const html = await fetch(baseUrl).then((response) => response.text())
  const schemas = extractJsonLd(html)
  const organization = schemas.find((schema) => schema["@type"] === "Organization")
  const website = schemas.find((schema) => schema["@type"] === "WebSite")

  assert.ok(organization)
  assert.ok(website)
  assert.deepEqual(
    organization.alternateName.filter((name) => name.startsWith("877")),
    ["877finger", "877 finger", "877FINGER"],
  )
  assert.deepEqual(
    website.alternateName.filter((name) => name.startsWith("877")),
    ["877finger", "877 finger", "877FINGER"],
  )
})

test("renders the finger page as part of the 877hand website", async () => {
  const html = await fetch(`${baseUrl}/finger`).then((response) => response.text())
  const schemas = extractJsonLd(html)
  const fingerPage = schemas.find((schema) => schema["@type"] === "WebPage")

  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/877hand\.vercel\.app\/finger"\/>/,
  )
  assert.match(html, /<title>877hand｜Banana Hand<\/title>/)
  assert.ok(fingerPage)
  assert.equal(fingerPage.name, "877finger")
  assert.equal(
    fingerPage.isPartOf["@id"],
    "https://877hand.vercel.app/#website",
  )
})
