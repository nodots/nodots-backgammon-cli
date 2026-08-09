import { describe, expect, it } from '@jest/globals'
import { tokenize } from '../shell/tokenize'

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('show board')).toEqual(['show', 'board'])
  })

  it('handles tabs and multiple spaces', () => {
    expect(tokenize('move   8/5\t6/5')).toEqual(['move', '8/5', '6/5'])
  })

  it('keeps quoted arguments as one token', () => {
    expect(tokenize('save "my opening trap"')).toEqual([
      'save',
      'my opening trap',
    ])
  })

  it('handles single quotes', () => {
    expect(tokenize("save 'two words'")).toEqual(['save', 'two words'])
  })

  it('returns an empty array for blank input', () => {
    expect(tokenize('   ')).toEqual([])
  })
})
