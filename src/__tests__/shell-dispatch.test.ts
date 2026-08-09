import { describe, expect, it, jest } from '@jest/globals'
import { buildRegistry } from '../shell/commands'
import { createShellContext } from '../shell/context'

type AnyGame = Record<string, any>

function makeReadyGame(): AnyGame {
  return {
    id: 'game-1',
    stateKind: 'moving',
    activeColor: 'white',
    activePlay: {
      moves: [
        {
          stateKind: 'ready',
          dieValue: 3,
          possibleMoves: [
            {
              origin: {
                kind: 'point',
                position: { clockwise: 8, counterclockwise: 17 },
                checkers: [{ id: 'checker-A', color: 'white' }],
              },
              destination: {
                kind: 'point',
                position: { clockwise: 5, counterclockwise: 20 },
                checkers: [],
              },
            },
          ],
        },
      ],
    },
    players: [
      {
        userId: 'me',
        color: 'white',
        direction: 'clockwise',
      },
    ],
    board: { points: [], bar: {} },
    asciiBoard: '<board>',
  }
}

function makeMockApi(game: AnyGame): {
  api: any
  calls: { makeMove: string[]; confirmTurn: number }
} {
  const calls = { makeMove: [] as string[], confirmTurn: 0 }
  const api = {
    getGame: jest.fn(async () => ({ success: true, data: game })),
    createGame: jest.fn(),
    rollForStart: jest.fn(),
    rollDice: jest.fn(),
    makeMove: jest.fn(),
    makeMoveWithCheckerId: jest.fn(async (_id: string, checkerId: string) => {
      calls.makeMove.push(checkerId)
      return { success: true, data: game }
    }),
    confirmTurn: jest.fn(async () => {
      calls.confirmTurn += 1
      return { success: true, data: game }
    }),
  }
  return { api, calls }
}

describe('shell dispatcher', () => {
  it('move resolves notation to a checker id and calls the API', async () => {
    const game = makeReadyGame()
    const { api, calls } = makeMockApi(game)
    const ctx = createShellContext(
      api,
      {} as any,
      { userId: 'me', email: 'me@example.com' }
    )
    ctx.currentGameId = 'game-1'

    const registry = buildRegistry()
    const move = registry.byName.get('move')
    expect(move).toBeDefined()
    await move!.run(['8/5'], ctx)
    expect(calls.makeMove).toEqual(['checker-A'])
  })

  it('move reports no legal move when notation does not match', async () => {
    const game = makeReadyGame()
    const { api, calls } = makeMockApi(game)
    const ctx = createShellContext(
      api,
      {} as any,
      { userId: 'me', email: 'me@example.com' }
    )
    ctx.currentGameId = 'game-1'

    const errLog = jest.spyOn(console, 'log').mockImplementation(() => {})
    const registry = buildRegistry()
    await registry.byName.get('move')!.run(['7/4'], ctx)
    expect(calls.makeMove).toEqual([])
    errLog.mockRestore()
  })

  it('move bails out when there is no active game', async () => {
    const { api, calls } = makeMockApi(makeReadyGame())
    const ctx = createShellContext(
      api,
      {} as any,
      { userId: 'me', email: 'me@example.com' }
    )
    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    const registry = buildRegistry()
    await registry.byName.get('move')!.run(['8/5'], ctx)
    expect(api.getGame).not.toHaveBeenCalled()
    expect(calls.makeMove).toEqual([])
    log.mockRestore()
  })

  it('hint exits cleanly when no active game', async () => {
    const { api } = makeMockApi(makeReadyGame())
    const ctx = createShellContext(
      api,
      {} as any,
      { userId: 'me' }
    )
    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    const registry = buildRegistry()
    await registry.byName.get('hint')!.run([], ctx)
    expect(api.getGame).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it('confirm calls the API confirm-turn endpoint', async () => {
    const game = makeReadyGame()
    const { api, calls } = makeMockApi(game)
    const ctx = createShellContext(
      api,
      {} as any,
      { userId: 'me', email: 'me@example.com' }
    )
    ctx.currentGameId = 'game-1'

    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    const registry = buildRegistry()
    await registry.byName.get('confirm')!.run([], ctx)
    expect(calls.confirmTurn).toBe(1)
    log.mockRestore()
  })

  it('confirm bails out when there is no active game', async () => {
    const { api, calls } = makeMockApi(makeReadyGame())
    const ctx = createShellContext(
      api,
      {} as any,
      { userId: 'me', email: 'me@example.com' }
    )
    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    const registry = buildRegistry()
    await registry.byName.get('confirm')!.run([], ctx)
    expect(calls.confirmTurn).toBe(0)
    log.mockRestore()
  })

  it('quit returns exit:true', async () => {
    const ctx = createShellContext({} as any, {} as any, { userId: 'me' })
    const registry = buildRegistry()
    const result = await registry.byName.get('quit')!.run([], ctx)
    expect(result).toEqual({ exit: true })
  })
})
