import { describe, expect, it, jest } from '@jest/globals'

jest.mock('../shell/savedGames', () => ({
  loadSavedGames: () => ({ alpha: 'g1', beta: 'g2' }),
}))

import { buildRegistry } from '../shell/commands'
import { makeCompleter } from '../shell/completer'

describe('shell completer', () => {
  const registry = buildRegistry()
  const complete = makeCompleter(registry)

  it('completes top-level command prefixes', () => {
    const [hits] = complete('he')
    expect(hits).toContain('help')
  })

  it('returns the full command list for an empty prefix', () => {
    const [hits] = complete('')
    expect(hits.length).toBe(registry.list.length)
  })

  it('completes show subtargets', () => {
    const [hits] = complete('show ')
    expect(hits.sort()).toEqual(['board', 'game', 'pipcount'])
  })

  it('completes saved-game names for load', () => {
    const [hits] = complete('load a')
    expect(hits).toEqual(['alpha'])
  })

  it('completes saved-game names for forget', () => {
    const [hits] = complete('forget b')
    expect(hits).toEqual(['beta'])
  })

  it('returns no completions for unknown commands', () => {
    const [hits] = complete('roll something')
    expect(hits).toEqual([])
  })
})
