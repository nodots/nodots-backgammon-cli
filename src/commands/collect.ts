import chalk from 'chalk'
import { Command } from 'commander'
import path from 'path'
import {
  DatasetWriter,
  buildLabeledSampleFromPlay,
  initializeGnubgHints,
  configureGnubgHints,
  buildHintContextFromGame,
  getMoveHints,
} from '@nodots-llc/backgammon-ai'
import { Game, setLogLevel } from '@nodots-llc/backgammon-core'
import type { BackgammonGame } from '@nodots-llc/backgammon-types'

export class CollectCommand extends Command {
  constructor() {
    super('collect')
    this.description('Collect supervised training data labeled by GNU Backgammon')
      .option('-g, --games <n>', 'Number of games to simulate', '10')
      .option(
        '-o, --out <dir>',
        'Output directory root (defaults to NDBG_TRAINING_ROOT or packages/ai/training). A timestamped subfolder is created when this equals the training root.'
      )
      .option('--shard-size <n>', 'Samples per shard', '100000')
      .option('-q, --quiet', 'Reduce logging output from core', false)
      .option('--log-level <level>', 'Core log level (DEBUG, INFO, WARN, ERROR)')
      .action(this.execute.bind(this))
  }

  private async execute(options: any): Promise<void> {
    const games = parseInt(options.games) || 1
    const trainingRoot = resolveTrainingRoot(options.out)
    const outRoot = trainingRoot
    const isTrainingRoot = true
    const outDir = isTrainingRoot ? path.join(outRoot, makeDatasetDirName()) : outRoot
    const shardSize = parseInt(options.shardSize) || 100000
    const quiet = !!options.quiet || (process.env.NDBG_QUIET === '1' || process.env.NDBG_QUIET === 'true')
    const cliLogLevel: string | undefined = options.logLevel
    const envLogLevel: string | undefined = process.env.NDBG_LOG_LEVEL
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const
    const normalize = (v?: string) => (v ? String(v).toUpperCase() : undefined)
    const desiredLevel = normalize(cliLogLevel) || normalize(envLogLevel) || (quiet ? 'WARN' : undefined)

    // Configure core logger level
    if (desiredLevel && levels.includes(desiredLevel as any)) {
      try { setLogLevel(desiredLevel as any) } catch {}
    } else if (desiredLevel) {
      // Invalid level provided; fall back to WARN if quiet, otherwise ignore
      if (quiet) { try { setLogLevel('WARN' as any) } catch {} }
    }

    console.log(chalk.blue(`Collecting ${games} games → ${outDir}`))

    // Ensure GNU Backgammon hints engine is initialized/configured
    // This powers both simulation and labeling
    try {
      await initializeGnubgHints()
      await configureGnubgHints({ evalPlies: 1, moveFilter: 1, usePruning: true })
    } catch (e) {
      console.warn(chalk.yellow('[collect] Warning: Failed to initialize/configure GNU BG hints. Falling back may degrade labels.'), e)
    }

    const writer = new DatasetWriter({ outDir, shardSize, writeCSV: true, dedupByFeatureHash: true })
    try {
      for (let i = 0; i < games; i++) {
        await this.runSingleGame(writer, i)
      }
    } finally {
      await writer.close()
    }

    console.log(chalk.green('Collection complete.'))
  }

  private async runSingleGame(writer: DatasetWriter, gameIndex: number): Promise<void> {
    let game: BackgammonGame = Game.createNewGame(
      { userId: `robot-A`, isRobot: true },
      { userId: `robot-B`, isRobot: true }
    ) as BackgammonGame

    let turnIdx = 0
    let plyIdx = 0

    while (game.stateKind !== 'completed') {
      switch (game.stateKind) {
        case 'rolling-for-start':
          game = Game.rollForStart(game)
          break
        case 'rolled-for-start':
        case 'rolling':
          game = Game.roll(game)
          break
        case 'moving': {
          // 1) Record a labeled sample for this turn using GNU BG as teacher
          const play = (game as any).activePlay
          if (play) {
            const sample = await buildLabeledSampleFromPlay(play, turnIdx, plyIdx)
            if (sample) {
              sample.gameId = (game as any).id || sample.gameId
              await writer.write(sample)
            }
            plyIdx += 1
          }

          // 2) Execute the turn using the core's hint-driven simulation strategy
          //    (mirrors dist/scripts/simulateGnuVsGnu.js)
          const rollTuple: [number, number] = ((game as any).activePlayer?.dice?.currentRoll || [0, 0]) as [number, number]

          // Build hint context and fetch top hint (try both dice orders)
          let hints: any[] | null = null
          try {
            const { request } = buildHintContextFromGame(game as any)
            request.dice = [rollTuple[0], rollTuple[1]]
            hints = await getMoveHints(request, 1)
            if (!hints || hints.length === 0 || !hints[0]?.moves?.length) {
              request.dice = [rollTuple[1], rollTuple[0]]
              hints = await getMoveHints(request, 1)
            }
          } catch {
            // If hints fail, we'll fall back to any legal move selection below
            hints = null
          }

          let moving: any = game
          let safety = 0
          while (moving.stateKind === 'moving' && safety++ < 8) {
            const activePlay = (moving as any).activePlay
            const readyMoves: any[] = (Array.from(activePlay?.moves || []) as any[]).filter(
              (m: any) => m.stateKind === 'ready' || (m.stateKind === 'in-progress' && !m.origin)
            ) as any[]
            if (readyMoves.length === 0) break

            // Map the top hint step to a possible move for one die
            let chosenDie: number | undefined
            let selectedOrigin: any | undefined
            let possibleMoves: any[] = []

            const top = hints && hints[0] && hints[0].moves && hints[0].moves[0]
            if (top) {
              outer: for (const m of readyMoves) {
                const dv = m.dieValue
                const pm = (Game as any).Board?.getPossibleMoves
                  ? (Game as any).Board.getPossibleMoves(moving.board, activePlay.player, dv)
                  : (require('@nodots-llc/backgammon-core').Board.getPossibleMoves(moving.board, activePlay.player, dv))
                const arr = Array.isArray(pm) ? pm : pm.moves
                for (const mv of arr) {
                  const fromKind = (mv.origin?.kind) || mv.origin?.checkercontainerKind || 'point'
                  const toKind = (mv.destination?.kind) || mv.destination?.checkercontainerKind || 'point'
                  // Use simple normalized comparison like in core script
                  const fromPos = mv.origin?.position || mv.origin?.clockwise || mv.origin?.counterclockwise
                  const toPos = mv.destination?.position || mv.destination?.clockwise || mv.destination?.counterclockwise
                  if (
                    top.fromPosition === fromPos &&
                    top.toPosition === toPos &&
                    top.fromContainer === fromKind &&
                    top.toContainer === toKind
                  ) {
                    chosenDie = dv
                    selectedOrigin = mv.origin
                    possibleMoves = arr
                    break outer
                  }
                }
              }
            }

            // Fallback: pick any legal move for first ready die
            if (!chosenDie || !selectedOrigin) {
              const m: any = readyMoves[0]
              const pm = require('@nodots-llc/backgammon-core').Board.getPossibleMoves(moving.board, activePlay.player, (m as any).dieValue)
              const arr = Array.isArray(pm) ? pm : pm.moves
              if (arr.length > 0) {
                chosenDie = (m as any).dieValue
                possibleMoves = arr
                selectedOrigin = arr[0].origin
              }
            }

            if (!chosenDie || !selectedOrigin) break
            const originChecker = selectedOrigin.checkers?.find((c: any) => c.color === moving.activeColor)
            if (!originChecker) break

            // Execute one move
            moving = Game.move(moving as any, originChecker.id) as BackgammonGame
            if (moving.stateKind !== 'moving') break
          }

          // Complete turn if needed and pass to next player
          if ((moving as any).stateKind === 'moving') {
            moving = (Game as any).checkAndCompleteTurn(moving)
          }
          if ((moving as any).stateKind === 'moved') {
            moving = Game.confirmTurn(moving as any) as BackgammonGame
            turnIdx += 1
            plyIdx = 0
          }

          game = moving as BackgammonGame
          break
        }
        case 'moved':
          game = Game.confirmTurn(game as any)
          break
        case 'doubled':
          // For now, auto-accept to continue flow
          try {
            game = Game.acceptDouble(game as any, (game as any).inactivePlayer)
          } catch {
            game = Game.refuseDouble(game as any, (game as any).inactivePlayer)
          }
          break
        default:
          // Ensure loop does not stall
          break
      }
    }
  }
}

function makeDatasetDirName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `NDBG-AI-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function resolveTrainingRoot(cliOut?: string): string {
  if (cliOut) return path.resolve(process.cwd(), cliOut)
  const env = process.env.NDBG_TRAINING_ROOT
  if (env && env.trim()) return path.resolve(process.cwd(), env)
  // Default to packages/ai/training relative to this repo structure
  // Attempt monorepo path from this file's dist location: packages/cli/dist/commands
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const d = __dirname
    const monorepoRoot = path.resolve(d, '../../../../')
    const aiTraining = path.join(monorepoRoot, 'packages', 'ai', 'training')
    return aiTraining
  } catch {
    return path.resolve(process.cwd(), 'training')
  }
}
