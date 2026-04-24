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

describe('TagParser – US-004-AC05: volume tag', () => {
  it('AC05: "# volume bgm 0.5" produces { type: "volume", channel: "bgm", value: 0.5 }', () => {
    const result = TagParser.parse(['# volume bgm 0.5'])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('volume')
    expect(result[0]!['channel']).toBe('bgm')
    expect(result[0]!['value']).toBe(0.5)
  })

  it('AC05: "# volume master 0" produces value of 0', () => {
    const result = TagParser.parse(['# volume master 0'])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('volume')
    expect(result[0]!['channel']).toBe('master')
    expect(result[0]!['value']).toBe(0)
  })

  it('AC05: "# volume sfx 1" produces value of 1', () => {
    const result = TagParser.parse(['# volume sfx 1'])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('volume')
    expect(result[0]!['channel']).toBe('sfx')
    expect(result[0]!['value']).toBe(1)
  })

  it('AC05: "# volume voice 0.75" produces value of 0.75', () => {
    const result = TagParser.parse(['# volume voice 0.75'])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('volume')
    expect(result[0]!['channel']).toBe('voice')
    expect(result[0]!['value']).toBeCloseTo(0.75)
  })

  it('AC05: parseOne handles volume tag without hash prefix', () => {
    const cmd = TagParser.parseOne('volume bgm 0.3')
    expect(cmd).not.toBeNull()
    expect(cmd!.type).toBe('volume')
    expect(cmd!['channel']).toBe('bgm')
    expect(cmd!['value']).toBeCloseTo(0.3)
  })

  it('AC05: non-volume tags without colons still work as before', () => {
    const result = TagParser.parse(['# scene_change'])
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('scene_change')
    expect(result[0]!['channel']).toBeUndefined()
  })
})
