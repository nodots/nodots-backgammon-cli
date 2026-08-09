import chalk from 'chalk'
import * as readline from 'readline'
import { ApiService } from '../services/api'
import { AuthService } from '../services/auth'
import { CliConfig } from '../types'
import { buildRegistry, CommandRegistry } from './commands'
import { makeCompleter } from './completer'
import { createShellContext, ShellContext } from './context'
import { loadHistory, saveHistory } from './history'
import { tokenize } from './tokenize'

function makePrompt(ctx: ShellContext): string {
  if (!ctx.currentGameId) return 'ndbg> '
  const short = ctx.currentGameId.slice(0, 8)
  return `ndbg [${short}]> `
}

async function dispatch(
  line: string,
  ctx: ShellContext,
  registry: CommandRegistry
): Promise<{ exit?: boolean }> {
  const tokens = tokenize(line)
  if (tokens.length === 0) return {}
  const [name, ...rest] = tokens
  const cmd = registry.byName.get(name)
  if (!cmd) {
    console.log(
      chalk.yellow(`Unknown command: ${name}. Type 'help' for a list.`)
    )
    return {}
  }
  const result = await cmd.run(rest, ctx)
  return result ?? {}
}

export async function runShell(): Promise<void> {
  const auth = new AuthService()
  const user = auth.getCurrentUser()
  if (!user) {
    console.log(chalk.red('Not authenticated. Run: ndbg login'))
    process.exit(1)
  }

  const config: Partial<CliConfig> = {
    apiUrl: process.env.NODOTS_API_URL,
    userId: user.userId,
    apiKey: user.token,
  }
  const api = new ApiService(config)

  const ctx = createShellContext(api, auth, user)
  const registry = buildRegistry()

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 1000,
    completer: makeCompleter(registry),
  })

  const existing = loadHistory()
  // readline stores history newest-first internally
  const rlAny = rl as unknown as { history: string[] }
  rlAny.history = existing.slice().reverse()

  console.log(chalk.cyanBright('Nodots Backgammon interactive shell.'))
  console.log(
    chalk.gray(
      "Type 'help' for commands. Tab completes. History at ~/.ndbg_history."
    )
  )
  rl.setPrompt(makePrompt(ctx))
  rl.prompt()

  for await (const raw of rl) {
    const line = raw.trim()
    if (line.length === 0) {
      rl.setPrompt(makePrompt(ctx))
      rl.prompt()
      continue
    }
    try {
      const { exit } = await dispatch(line, ctx, registry)
      if (exit) {
        rl.close()
        break
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(chalk.red(`Error: ${msg}`))
    }
    rl.setPrompt(makePrompt(ctx))
    rl.prompt()
  }

  const finalHistory = (rlAny.history ?? []).slice().reverse()
  saveHistory(finalHistory)
  console.log(chalk.gray('Goodbye.'))
}
