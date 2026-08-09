import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'

const HISTORY_PATH = join(homedir(), '.ndbg_history')
const MAX_HISTORY = 1000

export function loadHistory(): string[] {
  if (!existsSync(HISTORY_PATH)) return []
  try {
    return readFileSync(HISTORY_PATH, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  } catch {
    return []
  }
}

export function saveHistory(lines: string[]): void {
  const trimmed = lines.slice(-MAX_HISTORY)
  const dir = dirname(HISTORY_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(HISTORY_PATH, trimmed.join('\n') + '\n', 'utf8')
}
