export function tokenize(line: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    const c = line[i]
    if (c === ' ' || c === '\t') {
      i++
      continue
    }
    if (c === '"' || c === "'") {
      const quote = c
      i++
      let buf = ''
      while (i < line.length && line[i] !== quote) {
        buf += line[i]
        i++
      }
      if (line[i] === quote) i++
      out.push(buf)
      continue
    }
    let buf = ''
    while (i < line.length && line[i] !== ' ' && line[i] !== '\t') {
      buf += line[i]
      i++
    }
    out.push(buf)
  }
  return out
}
