import { CommandRegistry } from './commands'
import { loadSavedGames } from './savedGames'

export type CompleterResult = [string[], string]

export function makeCompleter(
  registry: CommandRegistry
): (line: string) => CompleterResult {
  return (line: string): CompleterResult => {
    const tokens = line.split(/\s+/)
    const atFirstToken = tokens.length <= 1
    const last = tokens[tokens.length - 1] ?? ''

    if (atFirstToken) {
      const hits = registry.list
        .map((c) => c.name)
        .filter((n) => n.startsWith(last))
      return [hits, last]
    }

    const cmd = tokens[0]
    if (cmd === 'help') {
      const hits = registry.list
        .map((c) => c.name)
        .filter((n) => n.startsWith(last))
      return [hits, last]
    }
    if (cmd === 'load' || cmd === 'forget') {
      const names = Object.keys(loadSavedGames())
      const hits = names.filter((n) => n.startsWith(last))
      return [hits, last]
    }
    if (cmd === 'show') {
      const targets = ['board', 'pipcount', 'game']
      const hits = targets.filter((n) => n.startsWith(last))
      return [hits, last]
    }
    return [[], last]
  }
}
