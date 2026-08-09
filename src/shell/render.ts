import chalk from 'chalk'

type AnyGame = Record<string, any>

export function printBoard(game: AnyGame): void {
  if (game.asciiBoard) {
    console.log(chalk.cyanBright('Board:'))
    console.log(game.asciiBoard)
  } else {
    console.log(chalk.yellow('No asciiBoard from API'))
  }
  console.log(
    chalk.gray(
      `state=${game.stateKind} activeColor=${game.activeColor} cube=${
        game.cube?.value ?? 1
      }`
    )
  )
}

export function printGameSummary(game: AnyGame): void {
  console.log(chalk.bold('Game'))
  console.log(`  id:          ${game.id}`)
  console.log(`  state:       ${game.stateKind}`)
  console.log(`  activeColor: ${game.activeColor}`)
  console.log(`  cube:        ${game.cube?.value ?? 1}`)
  const players = Array.isArray(game.players) ? game.players : []
  for (const p of players) {
    console.log(
      `  player:      ${p.color} ${p.direction} user=${p.userId} ${
        p.isRobot ? '(robot)' : ''
      }`
    )
  }
}

export function printHint(game: AnyGame, direction: string): void {
  const moves = Array.isArray(game.activePlay?.moves)
    ? game.activePlay.moves
    : []
  const ready = moves.filter((m: any) => m.stateKind === 'ready')
  if (ready.length === 0) {
    console.log(chalk.gray('No ready moves.'))
    return
  }
  for (const move of ready) {
    const dv = move.dieValue
    const possible = move.possibleMoves ?? []
    if (possible.length === 0) {
      console.log(`  die ${dv}: no legal move`)
      continue
    }
    const lines = possible.map((pm: any) => {
      const from = containerLabel(pm.origin, direction)
      const to = containerLabel(pm.destination, direction)
      return `${from}/${to}`
    })
    console.log(`  die ${dv}: ${lines.join('  ')}`)
  }
}

export function printPipCount(game: AnyGame): void {
  const points = game.board?.points ?? []
  const bar = game.board?.bar ?? {}
  const counts: Record<string, number> = {}

  const addChecker = (color: string, pip: number) => {
    counts[color] = (counts[color] ?? 0) + pip
  }

  for (const point of points) {
    for (const checker of point.checkers ?? []) {
      const color = checker.color
      const player = (game.players ?? []).find((p: any) => p.color === color)
      const direction = player?.direction
      if (!direction) continue
      const pip = point.position?.[direction]
      if (typeof pip === 'number') addChecker(color, pip)
    }
  }

  for (const direction of ['clockwise', 'counterclockwise']) {
    const checkers = bar[direction]?.checkers ?? []
    for (const checker of checkers) {
      addChecker(checker.color, 25)
    }
  }

  for (const color of Object.keys(counts)) {
    console.log(`  ${color}: ${counts[color]}`)
  }
}

export function containerLabel(container: any, direction: string): string {
  if (!container) return '?'
  if (container.kind === 'bar') return 'bar'
  if (container.kind === 'off') return 'off'
  const pos = container.position?.[direction]
  return pos != null ? String(pos) : '?'
}
