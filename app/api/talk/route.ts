import { NextRequest, NextResponse } from "next/server"
import { exec }      from "child_process"
import { promisify } from "util"
import { readFile, unlink, writeFile } from "fs/promises"
import { tmpdir }    from "os"
import { join }      from "path"
import { randomUUID } from "crypto"

const execAsync = promisify(exec)

const BIN_DIR     = join(process.cwd(), "bin")
const RHUBARB_BIN = join(BIN_DIR, "rhubarb")

function detectVoice(text: string): string {
  // Japanese characters → Kyoko voice
  return /[぀-ゟ゠-ヿ一-龯]/.test(text) ? "Kyoko" : "Samantha"
}

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text: string }
  if (!text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 })
  }

  const id      = randomUUID()
  const aiffPath = join(tmpdir(), `rhubarb-${id}.aiff`)
  const wavPath  = join(tmpdir(), `rhubarb-${id}.wav`)
  const jsonPath = join(tmpdir(), `rhubarb-${id}.json`)

  try {
    const voice = detectVoice(text)
    // Escape text for shell
    const escaped = text.replace(/"/g, '\\"').replace(/`/g, "\\`")

    // 1. macOS say → AIFF
    await execAsync(`say -v "${voice}" -o "${aiffPath}" "${escaped}"`)

    // 2. AIFF → WAV (Rhubarb requires WAV)
    await execAsync(`afconvert -f WAVE -d LEI16@22050 "${aiffPath}" "${wavPath}"`)

    // 3. Rhubarb — must run from BIN_DIR so it finds res/
    // Use arch -x86_64 for Apple Silicon + Rosetta
    await execAsync(
      `cd "${BIN_DIR}" && arch -x86_64 ./rhubarb -f json "${wavPath}" -o "${jsonPath}" --quiet`,
      { cwd: BIN_DIR }
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
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await Promise.allSettled([
      unlink(aiffPath).catch(() => {}),
      unlink(wavPath).catch(() => {}),
      unlink(jsonPath).catch(() => {}),
    ])
  }
}
