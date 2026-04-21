import { readdirSync } from 'fs'
import { join } from 'path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')

export async function list(): Promise<void> {
  const gamesDir = join(ROOT, 'games')
  let entries: string[]

  try {
    entries = readdirSync(gamesDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
  } catch {
    console.log('No games directory found.')
    return
  }

  if (entries.length === 0) {
    console.log('No games found in games/.')
    return
  }

  console.log('\nInstalled games:\n')
  console.log(`${'ID'.padEnd(24)} ${'Title'.padEnd(32)} ${'Version'.padEnd(10)}`)
  console.log('─'.repeat(68))

  for (const gameId of entries) {
    const configPath = join(gamesDir, gameId, 'game.config.ts')
    let title = '(no title)'
    let version = '—'

    try {
      const mod = await import(configPath) as { default?: Record<string, string> }
      const cfg = mod.default ?? (mod as Record<string, unknown> as Record<string, string>)
      title   = cfg['title']   ?? title
      version = cfg['version'] ?? version
    } catch { /* config not parseable */ }

    console.log(`${gameId.padEnd(24)} ${title.padEnd(32)} ${version.padEnd(10)}`)
  }

  console.log('')
}
