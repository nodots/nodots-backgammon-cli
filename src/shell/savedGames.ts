import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'

const SAVED_PATH = join(homedir(), '.ndbg', 'games.json')

export type SavedGames = Record<string, string>

export function loadSavedGames(): SavedGames {
  if (!existsSync(SAVED_PATH)) return {}
  try {
    const raw = readFileSync(SAVED_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as SavedGames
    return {}
  } catch {
    return {}
  }
}

export function writeSavedGames(games: SavedGames): void {
  const dir = dirname(SAVED_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(SAVED_PATH, JSON.stringify(games, null, 2), 'utf8')
}

export function saveGame(name: string, gameId: string): SavedGames {
  const games = loadSavedGames()
  games[name] = gameId
  writeSavedGames(games)
  return games
}

export function deleteSavedGame(name: string): SavedGames {
  const games = loadSavedGames()
  delete games[name]
  writeSavedGames(games)
  return games
}
