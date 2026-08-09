import chalk from 'chalk'
import { ShellContext } from './context'
import { parseMoveNotation, ParsedSegment, Point } from './moveParser'
import {
  containerLabel,
  printBoard,
  printGameSummary,
  printHint,
  printPipCount,
} from './render'
import {
  deleteSavedGame,
  loadSavedGames,
  saveGame,
} from './savedGames'

type AnyGame = Record<string, any>

export interface CommandResult {
  exit?: boolean
}

export interface CommandDef {
  name: string
  args?: string
  summary: string
  details?: string
  run: (args: string[], ctx: ShellContext) => Promise<CommandResult | void>
}

export interface CommandRegistry {
  list: CommandDef[]
  byName: Map<string, CommandDef>
}

export function buildRegistry(): CommandRegistry {
  const list: CommandDef[] = [
    {
      name: 'help',
      args: '[command]',
      summary: 'Show help for all commands or one command',
      run: helpCmd,
    },
    {
      name: 'new',
      args: '[opponent-user-id] [--robot]',
      summary: 'Start a new game against another user (or robot)',
      details:
        "With a user id, plays against that user. With --robot, picks the first available robot (or use --robot=<id> for a specific one). The new game becomes the shell's active game.",
      run: newGameCmd,
    },
    {
      name: 'robots',
      summary: 'List robot users available as opponents',
      run: robotsCmd,
    },
    {
      name: 'attach',
      args: '<game-id>',
      summary: "Make an existing server game the shell's active game",
      run: attachCmd,
    },
    {
      name: 'detach',
      summary: 'Forget the active game (does not delete it on the server)',
      run: async (_args, ctx) => {
        ctx.currentGameId = null
        console.log(chalk.gray('Detached.'))
      },
    },
    {
      name: 'roll',
      summary: 'Roll for start, or roll your dice',
      run: rollCmd,
    },
    {
      name: 'move',
      args: '<from/to> [<from/to> ...]',
      summary: 'Play moves using gnubg notation (e.g. move 8/5 6/5)',
      details:
        'Examples: move 8/5 6/5, move bar/20, move 6/off, move 13/8/5 (same checker via 8).',
      run: moveCmd,
    },
    {
      name: 'hint',
      summary: 'List the legal moves for the current dice',
      run: hintCmd,
    },
    {
      name: 'confirm',
      summary: 'Confirm your turn and pass play to the opponent',
      details:
        'Finalizes the current turn after you have moved all of your dice. The game must be in the `moved` state.',
      run: confirmCmd,
    },
    {
      name: 'show',
      args: '<board|pipcount|game>',
      summary: 'Display board, pip counts, or game summary',
      run: showCmd,
    },
    {
      name: 'save',
      args: '<name>',
      summary: 'Save the active game id under a name in ~/.ndbg/games.json',
      run: saveCmd,
    },
    {
      name: 'load',
      args: '<name|game-id>',
      summary: 'Attach to a saved game by name (or raw game id)',
      run: loadCmd,
    },
    {
      name: 'list',
      summary: 'List saved games',
      run: listCmd,
    },
    {
      name: 'forget',
      args: '<name>',
      summary: 'Remove a saved game from ~/.ndbg/games.json',
      run: forgetCmd,
    },
    {
      name: 'whoami',
      summary: 'Show the logged-in user',
      run: async (_args, ctx) => {
        const u = ctx.user
        console.log(
          `${u.email ?? u.userId} (userId=${u.userId ?? 'unknown'})`
        )
      },
    },
    {
      name: 'quit',
      summary: 'Exit the shell',
      run: async () => ({ exit: true }),
    },
    {
      name: 'exit',
      summary: 'Exit the shell',
      run: async () => ({ exit: true }),
    },
  ]

  const byName = new Map(list.map((c) => [c.name, c]))
  return { list, byName }
}

function requireGame(ctx: ShellContext): string | null {
  if (!ctx.currentGameId) {
    console.log(
      chalk.yellow(
        "No active game. Use 'new', 'attach <id>', or 'load <name>' first."
      )
    )
    return null
  }
  return ctx.currentGameId
}

async function fetchGame(ctx: ShellContext): Promise<AnyGame | null> {
  const id = requireGame(ctx)
  if (!id) return null
  const resp = await ctx.api.getGame(id)
  if (!resp.success || !resp.data) {
    console.error(chalk.red(`Failed to fetch game: ${resp.error}`))
    return null
  }
  return resp.data as AnyGame
}

function findMyPlayer(game: AnyGame, userId: string): AnyGame | null {
  const players = Array.isArray(game.players) ? game.players : []
  return players.find((p: AnyGame) => p.userId === userId) ?? null
}

async function helpCmd(args: string[], ctx: ShellContext): Promise<void> {
  const registry = buildRegistry()
  if (args.length === 0) {
    console.log(chalk.bold('Commands:'))
    for (const cmd of registry.list) {
      const sig = cmd.args ? `${cmd.name} ${cmd.args}` : cmd.name
      console.log(`  ${sig.padEnd(38)} ${cmd.summary}`)
    }
    console.log('')
    console.log("Type 'help <command>' for details.")
    return
  }
  const cmd = registry.byName.get(args[0])
  if (!cmd) {
    console.log(chalk.yellow(`Unknown command: ${args[0]}`))
    return
  }
  const sig = cmd.args ? `${cmd.name} ${cmd.args}` : cmd.name
  console.log(chalk.bold(sig))
  console.log(`  ${cmd.summary}`)
  if (cmd.details) console.log(`  ${cmd.details}`)
}

async function newGameCmd(args: string[], ctx: ShellContext): Promise<void> {
  if (!ctx.user.userId) {
    console.log(chalk.red('No userId on logged-in user; cannot create game.'))
    return
  }

  const positional: string[] = []
  let robotFlag = false
  let robotIdFromFlag: string | null = null
  for (const a of args) {
    if (a === '--robot') {
      robotFlag = true
    } else if (a.startsWith('--robot=')) {
      robotFlag = true
      robotIdFromFlag = a.slice('--robot='.length) || null
    } else if (a.startsWith('--')) {
      console.log(chalk.yellow(`Unknown flag: ${a}`))
      return
    } else {
      positional.push(a)
    }
  }

  let opponentId: string | null = positional[0] ?? robotIdFromFlag ?? null

  if (!opponentId && robotFlag) {
    opponentId = await pickFirstRobot(ctx)
    if (!opponentId) return
  }

  if (!opponentId) {
    console.log(
      chalk.yellow('Usage: new <opponent-user-id> | new --robot [--robot=<id>]')
    )
    return
  }

  const resp = await ctx.api.createGame(ctx.user.userId, opponentId, {
    player2IsRobot: robotFlag,
  })
  if (!resp.success || !resp.data) {
    console.error(chalk.red(`Create failed: ${resp.error}`))
    return
  }
  const game = resp.data as AnyGame
  ctx.currentGameId = game.id
  console.log(chalk.green(`Created game ${game.id}`))
  printBoard(game)
}

async function pickFirstRobot(ctx: ShellContext): Promise<string | null> {
  const resp = await ctx.api.getUsers()
  if (!resp.success || !resp.data) {
    console.error(chalk.red(`Failed to fetch users: ${resp.error}`))
    return null
  }
  const robots = (resp.data as AnyGame[]).filter(
    (u) => u.userType === 'robot'
  )
  if (robots.length === 0) {
    console.log(chalk.red('No robot users available on the server.'))
    return null
  }
  const robot = robots[0]
  console.log(
    chalk.gray(
      `Picking robot: ${robot.firstName ?? ''} ${robot.lastName ?? ''} (${
        robot.id
      })`
    )
  )
  return robot.id
}

async function robotsCmd(_args: string[], ctx: ShellContext): Promise<void> {
  const resp = await ctx.api.getUsers()
  if (!resp.success || !resp.data) {
    console.error(chalk.red(`Failed to fetch users: ${resp.error}`))
    return
  }
  const robots = (resp.data as AnyGame[]).filter(
    (u) => u.userType === 'robot'
  )
  if (robots.length === 0) {
    console.log(chalk.gray('(no robots)'))
    return
  }
  for (const r of robots) {
    const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()
    console.log(`  ${r.id.padEnd(40)} ${name || r.email || ''}`)
  }
}

async function attachCmd(args: string[], ctx: ShellContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.yellow('Usage: attach <game-id>'))
    return
  }
  const id = args[0]
  const resp = await ctx.api.getGame(id)
  if (!resp.success || !resp.data) {
    console.error(chalk.red(`Cannot attach: ${resp.error}`))
    return
  }
  ctx.currentGameId = id
  console.log(chalk.green(`Attached to ${id}`))
  printBoard(resp.data as AnyGame)
}

async function rollCmd(_args: string[], ctx: ShellContext): Promise<void> {
  const game = await fetchGame(ctx)
  if (!game) return
  const id = ctx.currentGameId as string
  let resp
  if (game.stateKind === 'rolling-for-start') {
    resp = await ctx.api.rollForStart(id)
  } else if (
    game.stateKind === 'rolled-for-start' ||
    game.stateKind === 'rolling'
  ) {
    resp = await ctx.api.rollDice(id)
  } else {
    console.log(
      chalk.yellow(`Cannot roll in state '${game.stateKind}'.`)
    )
    return
  }
  if (!resp.success || !resp.data) {
    console.error(chalk.red(`Roll failed: ${resp.error}`))
    return
  }
  printBoard(resp.data as AnyGame)
}

async function moveCmd(args: string[], ctx: ShellContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.yellow('Usage: move <from/to> [<from/to> ...]'))
    return
  }
  const parsed = parseMoveNotation(args)
  for (const e of parsed.errors) console.log(chalk.red(e))
  if (parsed.segments.length === 0) return

  for (const segment of parsed.segments) {
    const game = await fetchGame(ctx)
    if (!game) return
    if (!ctx.user.userId) {
      console.log(chalk.red('No userId; cannot move.'))
      return
    }
    const me = findMyPlayer(game, ctx.user.userId)
    if (!me) {
      console.log(chalk.red('You are not a player in this game.'))
      return
    }
    if (game.activeColor !== me.color) {
      console.log(
        chalk.yellow(`Not your turn (active=${game.activeColor}).`)
      )
      return
    }
    const checkerId = resolveMoveToChecker(game, me, segment)
    if (!checkerId) {
      console.log(
        chalk.red(
          `No legal move ${formatPoint(segment.from)}/${formatPoint(
            segment.to
          )} for current dice. Use 'hint' to see options.`
        )
      )
      return
    }
    const resp = await ctx.api.makeMoveWithCheckerId(
      ctx.currentGameId as string,
      checkerId
    )
    if (!resp.success || !resp.data) {
      console.error(chalk.red(`Move failed: ${resp.error}`))
      return
    }
  }
  const final = await fetchGame(ctx)
  if (final) {
    printBoard(final)
    if (final.stateKind === 'moved') {
      console.log(
        chalk.cyanBright(
          "All dice consumed. Type 'confirm' to end your turn and pass play."
        )
      )
    }
  }
}

function formatPoint(p: Point): string {
  return typeof p === 'number' ? String(p) : p
}

function resolveMoveToChecker(
  game: AnyGame,
  me: AnyGame,
  segment: ParsedSegment
): string | null {
  const moves = Array.isArray(game.activePlay?.moves)
    ? game.activePlay.moves
    : []
  const ready = moves.filter((m: AnyGame) => m.stateKind === 'ready')
  const target = (label: string, kind: 'origin' | 'destination'): boolean => {
    return label === formatPoint(kind === 'origin' ? segment.from : segment.to)
  }
  for (const move of ready) {
    for (const pm of move.possibleMoves ?? []) {
      const fromLabel = containerLabel(pm.origin, me.direction)
      const toLabel = containerLabel(pm.destination, me.direction)
      if (target(fromLabel, 'origin') && target(toLabel, 'destination')) {
        const checker = (pm.origin?.checkers ?? []).find(
          (c: AnyGame) => c.color === me.color
        )
        if (checker?.id) return checker.id
      }
    }
  }
  return null
}

async function confirmCmd(_args: string[], ctx: ShellContext): Promise<void> {
  const id = requireGame(ctx)
  if (!id) return
  const resp = await ctx.api.confirmTurn(id)
  if (!resp.success || !resp.data) {
    console.error(chalk.red(`Confirm failed: ${resp.error}`))
    return
  }
  const game = resp.data as AnyGame
  console.log(chalk.green('Turn confirmed. Opponent to play.'))
  printBoard(game)
}

async function hintCmd(_args: string[], ctx: ShellContext): Promise<void> {
  const game = await fetchGame(ctx)
  if (!game) return
  if (!ctx.user.userId) return
  const me = findMyPlayer(game, ctx.user.userId)
  if (!me) {
    console.log(chalk.red('You are not a player in this game.'))
    return
  }
  printHint(game, me.direction)
}

async function showCmd(args: string[], ctx: ShellContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.yellow('Usage: show <board|pipcount|game>'))
    return
  }
  const sub = args[0]
  const game = await fetchGame(ctx)
  if (!game) return
  switch (sub) {
    case 'board':
      printBoard(game)
      return
    case 'pipcount':
      printPipCount(game)
      return
    case 'game':
      printGameSummary(game)
      return
    default:
      console.log(chalk.yellow(`Unknown show target: ${sub}`))
  }
}

async function saveCmd(args: string[], ctx: ShellContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.yellow('Usage: save <name>'))
    return
  }
  const id = requireGame(ctx)
  if (!id) return
  saveGame(args[0], id)
  console.log(chalk.green(`Saved '${args[0]}' -> ${id}`))
}

async function loadCmd(args: string[], ctx: ShellContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.yellow('Usage: load <name|game-id>'))
    return
  }
  const key = args[0]
  const games = loadSavedGames()
  const id = games[key] ?? key
  return attachCmd([id], ctx)
}

async function listCmd(_args: string[], _ctx: ShellContext): Promise<void> {
  const games = loadSavedGames()
  const entries = Object.entries(games)
  if (entries.length === 0) {
    console.log(chalk.gray('(no saved games)'))
    return
  }
  for (const [name, id] of entries) {
    console.log(`  ${name.padEnd(20)} ${id}`)
  }
}

async function forgetCmd(args: string[], _ctx: ShellContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.yellow('Usage: forget <name>'))
    return
  }
  deleteSavedGame(args[0])
  console.log(chalk.gray(`Forgot '${args[0]}'.`))
}
