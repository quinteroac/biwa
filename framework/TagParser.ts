export interface TagCommand {
  type: string
  id?: string
  exit?: boolean
  [key: string]: unknown
}

export class TagParser {
  static parse(tags: string[]): TagCommand[] {
    return tags.map(t => TagParser.parseOne(t)).filter((c): c is TagCommand => c !== null)
  }

  static parseOne(raw: string): TagCommand | null {
    const trimmed = raw.trim().replace(/^#\s*/, '')
    if (!trimmed) return null

    const parts = trimmed.split(',').map(s => s.trim())
    const first = parts[0]!
    const colonIdx = first.indexOf(':')

    if (colonIdx === -1) {
      return { type: first.trim() }
    }

    const type = first.slice(0, colonIdx).trim()
    const cmd: TagCommand = { type }

    const remaining = trimmed.slice(colonIdx + 1)
    const tokens = remaining.split(',').map(s => s.trim())

    if (tokens[0] && !tokens[0].includes(':')) {
      if (tokens[0] === 'exit') {
        cmd.exit = true
      } else {
        cmd.id = tokens[0]
      }
      for (let i = 1; i < tokens.length; i++) {
        const kv = tokens[i]!
        const ci = kv.indexOf(':')
        if (ci !== -1) {
          const k = kv.slice(0, ci).trim()
          const v = kv.slice(ci + 1).trim()
          cmd[k] = v
        } else if (kv === 'exit') {
          cmd.exit = true
        }
      }
    } else {
      for (const token of tokens) {
        const ci = token.indexOf(':')
        if (ci !== -1) {
          const k = token.slice(0, ci).trim()
          const v = token.slice(ci + 1).trim()
          if (!cmd.id && k === type) {
            cmd.id = v
          } else {
            cmd[k] = v
          }
        } else if (token === 'exit') {
          cmd.exit = true
        } else if (token) {
          cmd.id = token
        }
      }
    }

    if (type === 'save' && !cmd.id) {
      delete cmd.id
    }

    return cmd
  }
}
