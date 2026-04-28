import { Elysia } from 'elysia'
import { existsSync } from 'fs'
import { extname } from 'path'
import { getProjectDiagnostics, getProjectSummary, listProjects } from './projects.ts'
import { listStoryFiles, readStoryFile, writeStoryFile } from './story.ts'
import { listAssets, resolveAssetFile } from './assets.ts'
import { listScenes, readScene, writeScene } from './scenes.ts'

function jsonError(message: string, status = 500): Response {
  return Response.json({ error: message }, { status })
}

function mime(path: string): string {
  const ext = extname(path).toLowerCase()
  return ({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  } as Record<string, string>)[ext] ?? 'application/octet-stream'
}

export const studioApi = new Elysia()
  .get('/api/health', () => ({
    ok: true,
    service: 'vn-studio',
  }))
  .get('/api/projects', async () => ({
    projects: await listProjects(),
  }))
  .get('/api/projects/:gameId', async ({ params }) => {
    try {
      return { project: await getProjectSummary(params.gameId) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/doctor', async ({ params }) => {
    try {
      return { diagnostics: await getProjectDiagnostics(params.gameId) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/story', async ({ params }) => {
    try {
      return { files: await listStoryFiles(params.gameId) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/story/file', async ({ params, query }) => {
    try {
      const path = typeof query['path'] === 'string' ? query['path'] : ''
      return await readStoryFile(params.gameId, path)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .put('/api/projects/:gameId/story/file', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; content?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing story file path.')
      if (typeof payload.content !== 'string') throw new Error('Missing story file content.')
      return await writeStoryFile(params.gameId, payload.path, payload.content)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/assets', async ({ params }) => {
    try {
      return { assets: await listAssets(params.gameId) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/assets/file', ({ params, query }) => {
    try {
      const path = typeof query['path'] === 'string' ? query['path'] : ''
      const filePath = resolveAssetFile(params.gameId, path)
      if (!existsSync(filePath)) return jsonError(`Asset file not found: ${path}`, 404)
      return new Response(Bun.file(filePath), { headers: { 'Content-Type': mime(filePath) } })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .get('/api/projects/:gameId/scenes', async ({ params }) => {
    try {
      return { scenes: await listScenes(params.gameId) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/scenes/file', async ({ params, query }) => {
    try {
      const path = typeof query['path'] === 'string' ? query['path'] : ''
      return await readScene(params.gameId, path)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .put('/api/projects/:gameId/scenes/file', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; scene?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing scene file path.')
      if (typeof payload.scene !== 'object' || payload.scene === null || Array.isArray(payload.scene)) {
        throw new Error('Missing scene payload.')
      }
      return await writeScene(params.gameId, payload.path, payload.scene as Parameters<typeof writeScene>[2])
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })

export type StudioApi = typeof studioApi

if (import.meta.main) {
  const port = Number(process.env['STUDIO_API_PORT'] ?? 4318)
  const hostname = process.env['STUDIO_API_HOST'] ?? process.env['STUDIO_HOST'] ?? '0.0.0.0'
  studioApi.listen({
    hostname,
    port,
  })
  console.log(`VN Studio API listening on http://${hostname}:${port}`)
}
