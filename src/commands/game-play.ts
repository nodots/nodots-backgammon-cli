import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import { ApiService } from '../services/api'
import { AuthService } from '../services/auth'
import { CliConfig } from '../types'

const POLL_MS = 2000

export class GamePlayCommand extends Command {
  constructor() {
    super('game-play')
    this.description('Start interactive game session')
      .argument('<game-id>', 'Game ID')
      .action(this.execute.bind(this))
  }

  private async execute(gameId: string): Promise<void> {
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

    console.log(chalk.blue(`Game ID: ${gameId}`))
    console.log(chalk.gray(`You are ${authUser.email || authUser.userId}`))

    while (true) {
      const resp = await api.getGame(gameId)
      if (!resp.success || !resp.data) {
        console.error(chalk.red('Failed to fetch game:', resp.error))
        return
      }
      const game = resp.data as any

      this.renderBoard(game)

      if (game.stateKind === 'completed') {
        const winnerColor = game.winner?.color ?? game.activeColor
        console.log(chalk.green(`Game completed. Winner: ${winnerColor}`))
        return
      }

      const me = this.findMyPlayer(game, authUser.userId)
      if (!me) {
        console.error(chalk.red('You are not a player in this game.'))
        return
      }
      const isMyTurn = game.activeColor === me.color

      if (!isMyTurn) {
        console.log(
          chalk.yellow(
            `Waiting on ${game.activeColor} (state: ${game.stateKind})…`
          )
        )
        await sleep(POLL_MS)
        continue
      }

      // It is our turn. Dispatch on stateKind.
      switch (game.stateKind) {
        case 'rolling-for-start': {
          const { go } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'go',
              message: 'Roll for start?',
              default: true,
            },
          ])
          if (!go) return
          const r = await api.rollForStart(gameId)
          if (!r.success) console.error(chalk.red(r.error))
          break
        }
        case 'rolled-for-start':
        case 'rolling': {
          const { go } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'go',
              message: 'Roll dice?',
              default: true,
            },
          ])
          if (!go) return
          const r = await api.rollDice(gameId)
          if (!r.success) console.error(chalk.red(r.error))
          break
        }
        case 'rolled':
        case 'preparing-move': {
          // Transient states; server should advance to 'moving' shortly.
          await sleep(POLL_MS)
          break
        }
        case 'moving': {
          const cont = await this.playMove(api, gameId, game, me)
          if (!cont) return
          break
        }
        case 'moved': {
          // Waiting for server to transition to next player's rolling state.
          await sleep(POLL_MS)
          break
        }
        default: {
          console.log(
            chalk.gray(`Unhandled state: ${game.stateKind}, polling…`)
          )
          await sleep(POLL_MS)
        }
      }
    }
  }

  private renderBoard(game: any): void {
    console.clear()
    if (game.asciiBoard) {
      console.log(chalk.cyanBright('Board:'))
      console.log(game.asciiBoard)
    } else {
      console.log(chalk.red('No asciiBoard from API'))
    }
    console.log(
      chalk.gray(
        `state=${game.stateKind} activeColor=${game.activeColor} cube=${
          game.cube?.value ?? 1
        }`
      )
    )
  }

  private findMyPlayer(game: any, userId: string): any | null {
    const players = Array.isArray(game.players)
      ? game.players
      : Array.from(game.players ?? [])
    return players.find((p: any) => p.userId === userId) ?? null
  }

  // Returns false to exit the loop.
  private async playMove(
    api: ApiService,
    gameId: string,
    game: any,
    me: any
  ): Promise<boolean> {
    const movesSrc = game.activePlay?.moves
    const moves: any[] = Array.isArray(movesSrc)
      ? movesSrc
      : movesSrc
        ? Array.from(movesSrc)
        : []
    const readyMoves = moves.filter((m) => m.stateKind === 'ready')

    if (readyMoves.length === 0) {
      console.log(chalk.gray('No ready moves; waiting…'))
      await sleep(POLL_MS)
      return true
    }

    // Build a unique list of (checkerId, dieValue, label) choices from the
    // possibleMoves on each ready die.
    type Choice = {
      label: string
      checkerId: string
      dieValue: number
    }
    const choiceMap = new Map<string, Choice>()
    for (const move of readyMoves) {
      for (const pm of move.possibleMoves ?? []) {
        const origin = pm.origin
        const dest = pm.destination
        const fromLabel = this.containerLabel(origin, me.direction)
        const toLabel = this.containerLabel(dest, me.direction)
        // Pick the first checker of our color on the origin.
        const checker = (origin?.checkers ?? []).find(
          (c: any) => c.color === me.color
        )
        if (!checker) continue
        const key = `${checker.id}|${move.dieValue}|${toLabel}`
        if (!choiceMap.has(key)) {
          choiceMap.set(key, {
            label: `die ${move.dieValue}: ${fromLabel} → ${toLabel}`,
            checkerId: checker.id,
            dieValue: move.dieValue,
          })
        }
      }
    }

    const choices = Array.from(choiceMap.values())
    if (choices.length === 0) {
      console.log(
        chalk.yellow('No legal moves available; forfeiting remaining dice.')
      )
      await sleep(POLL_MS)
      return true
    }

    const { picked } = await inquirer.prompt([
      {
        type: 'list',
        name: 'picked',
        message: 'Pick a move:',
        choices: [
          ...choices.map((c) => ({ name: c.label, value: c.checkerId })),
          { name: 'Quit', value: '__quit__' },
        ],
      },
    ])
    if (picked === '__quit__') return false

    const r = await api.makeMoveWithCheckerId(gameId, picked)
    if (!r.success) console.error(chalk.red(r.error))
    return true
  }

  private containerLabel(container: any, direction: string): string {
    if (!container) return '?'
    if (container.kind === 'bar') return 'bar'
    if (container.kind === 'off') return 'off'
    const pos = container.position?.[direction]
    return pos != null ? String(pos) : '?'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
