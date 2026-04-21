import chalk from 'chalk'
import { Command } from 'commander'
import { ApiService } from '../services/api'
import { AuthService } from '../services/auth'
import { CliConfig } from '../types'

const DEFAULT_ROBOT1 = 'GNU Advanced'
const DEFAULT_ROBOT2 = 'GNU Advanced'
const DEFAULT_FRAME_MS = 3000
const STATE_TIMEOUT_MS = 120_000

export class RobotVsRobotCommand extends Command {
  constructor() {
    super('robot-vs-robot')
    this.description('Watch two robots play a full game in the CLI')
      .option('--robot1 <name>', 'Name prefix of robot 1', DEFAULT_ROBOT1)
      .option('--robot2 <name>', 'Name prefix of robot 2', DEFAULT_ROBOT2)
      .option(
        '--frame-ms <ms>',
        'Minimum ms between rendered frames',
        String(DEFAULT_FRAME_MS)
      )
      .action(this.execute.bind(this))
  }

  private async execute(options: {
    robot1: string
    robot2: string
    frameMs: string
  }): Promise<void> {
    const auth = new AuthService()
    const authUser = auth.getCurrentUser()
    if (!authUser?.userId) {
      console.log(chalk.red('Not authenticated. Run: ndbg login'))
      return
    }

    const config: CliConfig = {
      apiUrl: process.env.NODOTS_API_URL || 'https://localhost:3443',
      userId: authUser.userId,
      apiKey: authUser.token,
    }
    const api = new ApiService(config)

    const frameMs = parseInt(options.frameMs, 10) || DEFAULT_FRAME_MS

    const usersResp = await api.getUsers()
    if (!usersResp.success || !usersResp.data) {
      console.error(chalk.red('Failed to fetch users:', usersResp.error))
      return
    }
    const users = usersResp.data as any[]
    const robots = users.filter((u) => u.userType === 'robot')

    const r1 = pickRobot(robots, options.robot1)
    const r2 = pickRobot(robots, options.robot2)
    if (!r1 || !r2) {
      console.error(
        chalk.red(
          `Could not find robots matching "${options.robot1}" and "${options.robot2}".`
        )
      )
      console.log(chalk.gray('Available robots:'))
      for (const r of robots) {
        console.log(
          chalk.gray(`  - ${r.firstName} ${r.lastName} (${r.email})`)
        )
      }
      return
    }

    console.log(
      chalk.cyan(
        `${r1.firstName} ${r1.lastName}  vs  ${r2.firstName} ${r2.lastName}`
      )
    )
    console.log(chalk.gray(`Frame pacing: ${frameMs}ms`))

    const createResp = await api.createGame(r1.id, r2.id, {
      player1IsRobot: true,
      player2IsRobot: true,
    })
    if (!createResp.success || !createResp.data) {
      console.error(chalk.red('Failed to create game:', createResp.error))
      return
    }
    const gameId = (createResp.data as any).id
    console.log(chalk.gray(`Game ID: ${gameId}`))

    // Kick off with roll-for-start; the server queue will drive the rest.
    const rfs = await api.rollForStart(gameId)
    if (!rfs.success) {
      console.error(chalk.red('roll-for-start failed:', rfs.error))
      return
    }

    let lastSig = ''
    let lastChangeAt = Date.now()
    let lastRenderAt = 0

    while (true) {
      const resp = await api.getGame(gameId)
      if (!resp.success || !resp.data) {
        console.error(chalk.red('getGame failed:', resp.error))
        return
      }
      const game = resp.data as any

      const sig = signature(game)
      const now = Date.now()
      const changed = sig !== lastSig

      if (changed) {
        lastSig = sig
        lastChangeAt = now
      }

      // Only render on change, and pace at most one frame per frameMs.
      if (changed && now - lastRenderAt >= frameMs) {
        render(game, r1, r2)
        lastRenderAt = now
      } else if (changed) {
        const wait = frameMs - (now - lastRenderAt)
        await sleep(wait)
        render(game, r1, r2)
        lastRenderAt = Date.now()
      }

      if (game.stateKind === 'completed') {
        const winnerColor =
          game.winner?.color ??
          game.players?.find((p: any) => p.pipCount === 0)?.color ??
          '?'
        console.log(chalk.green(`\nGame over. Winner: ${winnerColor}`))
        return
      }

      if (now - lastChangeAt > STATE_TIMEOUT_MS) {
        console.error(
          chalk.red(
            `\nNo state change for ${Math.floor(
              STATE_TIMEOUT_MS / 1000
            )}s. Aborting. Last state: ${game.stateKind} (${game.activeColor})`
          )
        )
        return
      }

      // Short poll between frames; render gating handles pacing.
      await sleep(500)
    }
  }
}

function pickRobot(robots: any[], name: string): any | null {
  const needle = name.toLowerCase()
  const full = (r: any) =>
    `${r.firstName ?? ''} ${r.lastName ?? ''}`.toLowerCase().trim()
  return (
    robots.find((r) => full(r) === needle) ??
    robots.find((r) => full(r).startsWith(needle)) ??
    robots.find((r) => (r.email ?? '').toLowerCase().startsWith(needle)) ??
    null
  )
}

function signature(game: any): string {
  // Changes we care about: stateKind, activeColor, and the board layout.
  // asciiBoard reflects the latter and is already a compact string.
  return `${game.stateKind}|${game.activeColor}|${game.asciiBoard ?? ''}`
}

function render(game: any, r1: any, r2: any): void {
  console.clear()
  const header =
    `${r1.firstName} ${r1.lastName}  vs  ${r2.firstName} ${r2.lastName}` +
    `   state=${game.stateKind}   active=${game.activeColor}`
  console.log(chalk.cyanBright(header))
  if (game.asciiBoard) {
    console.log(game.asciiBoard)
  } else {
    console.log(chalk.red('(no asciiBoard)'))
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)))
}
