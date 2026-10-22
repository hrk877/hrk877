import { NextRequest, NextResponse } from "next/server"
import { execFile }  from "child_process"
import { promisify } from "util"
import { readFile, unlink, writeFile } from "fs/promises"
import { tmpdir }    from "os"
import { join }      from "path"
import { randomUUID } from "crypto"

const execFileAsync = promisify(execFile)
const processOptions = { timeout: 30_000, maxBuffer: 1024 * 1024, shell: false } as const

const BIN_DIR     = join(process.cwd(), "bin")

function detectVoice(text: string): string {
  // Japanese characters → Kyoko voice
  return /[぀-ゟ゠-ヿ一-龯]/.test(text) ? "Kyoko" : "Samantha"
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const text = body && typeof body === "object" && "text" in body ? body.text : undefined
  if (typeof text !== "string" || !text.trim() || text.length > 2000 || text.includes("\0")) {
    return NextResponse.json({ error: "text must be 1–2000 characters without NUL" }, { status: 400 })
  }
  // This pipeline depends on macOS say/afconvert and a macOS Rhubarb binary.
  if (process.platform !== "darwin") {
    return NextResponse.json({ error: "audio generation is unavailable on this host" }, { status: 503 })
  }

  const id      = randomUUID()
  const aiffPath = join(tmpdir(), `rhubarb-${id}.aiff`)
  const wavPath  = join(tmpdir(), `rhubarb-${id}.wav`)
  const jsonPath = join(tmpdir(), `rhubarb-${id}.json`)
  const textPath = join(tmpdir(), `rhubarb-${id}.txt`)

  try {
    const voice = detectVoice(text)
    // Read speech from a private file so text cannot become shell syntax or flags.
    await writeFile(textPath, text, { encoding: "utf8", mode: 0o600, flag: "wx" })
    await execFileAsync("say", ["-v", voice, "-o", aiffPath, "-f", textPath], processOptions)

    // 2. AIFF → WAV (Rhubarb requires WAV)
    await execFileAsync("afconvert", ["-f", "WAVE", "-d", "LEI16@22050", aiffPath, wavPath], processOptions)

    // 3. Rhubarb — must run from BIN_DIR so it finds res/
    // Use arch -x86_64 for Apple Silicon + Rosetta
    await execFileAsync(
      "arch", ["-x86_64", "./rhubarb", "-f", "json", wavPath, "-o", jsonPath, "--quiet"],
      { ...processOptions, cwd: BIN_DIR }
    )

    // 4. Read results
    const [wavBuf, rhubarbRaw] = await Promise.all([
      readFile(wavPath),
      readFile(jsonPath, "utf-8"),
    ])

    const { mouthCues, metadata } = JSON.parse(rhubarbRaw) as {
      mouthCues: { start: number; end: number; value: string }[]
      metadata:  { duration: number }
    }

    return NextResponse.json({
      audioBase64: wavBuf.toString("base64"),
      mouthCues,
      duration: metadata.duration,
    })
  } catch (err) {
    console.error("[/api/talk] error:", err)
    return NextResponse.json({ error: "audio generation failed" }, { status: 500 })
  } finally {
    await Promise.allSettled([
      unlink(textPath).catch(() => {}),
      unlink(aiffPath).catch(() => {}),
      unlink(wavPath).catch(() => {}),
      unlink(jsonPath).catch(() => {}),
    ])
  }
}
