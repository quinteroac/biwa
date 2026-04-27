#!/usr/bin/env bun
// CLI entry point. Usage: bun manager/cli.ts <command> [args]

import { dev }      from './commands/dev.ts'
import { build }    from './commands/build.ts'
import { newGame }  from './commands/new.ts'
import { list }     from './commands/list.ts'
import { doctor }   from './commands/doctor.ts'

const [,, command, ...args] = process.argv

const commands: Record<string, (...a: string[]) => Promise<void>> = {
  dev,
  build,
  new: newGame,
  list,
  doctor,
}

if (!command || !commands[command]) {
  console.log(`
Visual Novel Manager

Usage: bun manager/cli.ts <command> [args]

Commands:
  dev   [gameId]          Start dev server for a game
  build [gameId]          Build game for production
  new   <gameId> [title]  Scaffold a new game
  list                    List all games
  doctor [gameId] [--json] Validate game content pipeline
`)
  process.exit(command ? 1 : 0)
}

try {
  await commands[command]!(...args)
} catch (e) {
  const err = e instanceof Error ? e : new Error(String(e))
  console.error(`[${command}] Error:`, err.message)
  process.exit(1)
}
