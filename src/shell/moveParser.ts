export type Point = number | 'bar' | 'off'

export interface ParsedSegment {
  from: Point
  to: Point
}

export interface ParseResult {
  segments: ParsedSegment[]
  errors: string[]
}

function parsePoint(token: string): Point | null {
  const t = token.trim().toLowerCase()
  if (t === 'bar' || t === 'b') return 'bar'
  if (t === 'off' || t === 'o') return 'off'
  const n = Number(t)
  if (Number.isInteger(n) && n >= 1 && n <= 24) return n
  return null
}

export function parseMoveNotation(tokens: string[]): ParseResult {
  const segments: ParsedSegment[] = []
  const errors: string[] = []

  for (const token of tokens) {
    const parts = token.split('/')
    if (parts.length < 2) {
      errors.push(`Invalid move '${token}': expected from/to`)
      continue
    }
    const points = parts.map(parsePoint)
    const badIdx = points.findIndex((p) => p === null)
    if (badIdx >= 0) {
      errors.push(`Invalid point '${parts[badIdx]}' in '${token}'`)
      continue
    }
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({ from: points[i] as Point, to: points[i + 1] as Point })
    }
  }

  return { segments, errors }
}
