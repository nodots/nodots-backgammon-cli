import { describe, expect, it } from '@jest/globals'
import { parseMoveNotation } from '../shell/moveParser'

describe('parseMoveNotation', () => {
  it('parses a simple from/to', () => {
    const result = parseMoveNotation(['8/5'])
    expect(result.errors).toEqual([])
    expect(result.segments).toEqual([{ from: 8, to: 5 }])
  })

  it('parses bar entry', () => {
    const result = parseMoveNotation(['bar/20'])
    expect(result.segments).toEqual([{ from: 'bar', to: 20 }])
  })

  it('parses bear-off', () => {
    const result = parseMoveNotation(['6/off'])
    expect(result.segments).toEqual([{ from: 6, to: 'off' }])
  })

  it('expands chained notation into segments', () => {
    const result = parseMoveNotation(['13/8/5'])
    expect(result.segments).toEqual([
      { from: 13, to: 8 },
      { from: 8, to: 5 },
    ])
  })

  it('parses multiple tokens', () => {
    const result = parseMoveNotation(['8/5', '6/5'])
    expect(result.segments).toEqual([
      { from: 8, to: 5 },
      { from: 6, to: 5 },
    ])
  })

  it('reports an error for out-of-range points', () => {
    const result = parseMoveNotation(['30/5'])
    expect(result.segments).toEqual([])
    expect(result.errors.length).toBe(1)
  })

  it('reports an error when no slash', () => {
    const result = parseMoveNotation(['85'])
    expect(result.segments).toEqual([])
    expect(result.errors.length).toBe(1)
  })

  it('accepts short forms b and o', () => {
    const result = parseMoveNotation(['b/20', '6/o'])
    expect(result.segments).toEqual([
      { from: 'bar', to: 20 },
      { from: 6, to: 'off' },
    ])
  })
})
