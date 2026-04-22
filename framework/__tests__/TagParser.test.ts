import { describe, it, expect } from 'bun:test'
import { TagParser } from '../TagParser.ts'

describe('TagParser – US-001-AC01: end_screen tag', () => {
  it('AC01: bare "# end_screen" tag produces { type: "end_screen" }', () => {
    const result = TagParser.parse(['# end_screen'])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('end_screen')
  })

  it('AC01: end_screen without hash prefix also parses correctly', () => {
    const result = TagParser.parse(['end_screen'])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('end_screen')
  })

  it('AC01: end_screen with title param captures title', () => {
    const result = TagParser.parse(['# end_screen: title: The End'])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('end_screen')
    expect(result[0]!['title']).toBe('The End')
  })

  it('AC01: end_screen with title and message captures both', () => {
    const result = TagParser.parse(['# end_screen: title: The End, message: Thank you'])
    expect(result).toHaveLength(1)
    const cmd = result[0]!
    expect(cmd.type).toBe('end_screen')
    expect(cmd['title']).toBe('The End')
    expect(cmd['message']).toBe('Thank you')
  })

  it('AC01: TagParser.parseOne returns TagCommand with type "end_screen"', () => {
    const cmd = TagParser.parseOne('# end_screen')
    expect(cmd).not.toBeNull()
    expect(cmd!.type).toBe('end_screen')
  })
})
