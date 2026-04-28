const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '')

const processes = [
  Bun.spawn(['bun', 'studio/server/index.ts'], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  }),
  Bun.spawn(['bunx', 'vite', '--config', 'studio/app/vite.config.ts'], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  }),
]

function stopAll() {
  for (const process of processes) process.kill()
}

process.on('SIGINT', () => {
  stopAll()
  process.exit(0)
})

process.on('SIGTERM', () => {
  stopAll()
  process.exit(0)
})

await Promise.race(processes.map(process => process.exited))
stopAll()
