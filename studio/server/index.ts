import { Elysia } from 'elysia'
import { existsSync } from 'fs'
import { extname } from 'path'
import { createProject, getProjectDiagnostics, getProjectSummary, listProjects, updateProjectIdentity, uploadProjectCover } from './projects.ts'
import { createStoryFolder, deleteStoryFile, deleteStoryFolder, listStoryEntries, readStoryFile, renameStoryFile, renameStoryFolder, writeStoryFile } from './story.ts'
import { deleteArtStyleImage, editArtStyleImage, generateArtStyleImage, listArtStyle, listAssets, resolveAssetFile, uploadArtStyleImage } from './assets.ts'
import { createSceneBackgroundFolder, createSceneFile, createSceneFolder, deleteSceneBackground, deleteSceneFile, editSceneBackground, generateSceneBackground, generateSceneFile, listSceneEntries, readScene, uploadSceneBackground, uploadSceneFile, writeScene } from './scenes.ts'
import { createCharacterSpritesheetFolder, deleteCharacterFile, deleteCharacterSheetConcept, deleteCharacterSpritesheet, editCharacterSheetConcept, generateCharacterAtlas, generateCharacterSheetConcept, generateCharacterSpritesheet, listCharacters, readCharacter, uploadCharacterSheetConcept, uploadCharacterSpritesheet, writeCharacter } from './characters.ts'
import { installOfficialPlugin, listStudioPlugins, removeOfficialPlugin } from './plugins.ts'
import { getBuildManifest, getBuilds, previewFileExists, previewMime, resolvePreviewFile, runStudioBuild } from './builds.ts'
import { analyzeAuthoring } from './authoring.ts'
import { readStudioSettings, writeStudioSettings } from './settings.ts'

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
  .post('/api/projects', async ({ body }) => {
    try {
      const payload = body as { gameId?: unknown; title?: unknown }
      if (typeof payload.gameId !== 'string') throw new Error('Missing project id.')
      if (payload.title !== undefined && typeof payload.title !== 'string') throw new Error('Project title must be text.')
      return await createProject(payload.gameId, payload.title)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('already exists') ? 409 : 400)
    }
  })
  .get('/api/projects/:gameId', async ({ params }) => {
    try {
      return { project: await getProjectSummary(params.gameId) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .put('/api/projects/:gameId/identity', async ({ body, params }) => {
    try {
      const payload = body as { title?: unknown; description?: unknown; coverPath?: unknown }
      if (typeof payload.title !== 'string') throw new Error('Missing project title.')
      if (typeof payload.description !== 'string') throw new Error('Missing project description.')
      if (typeof payload.coverPath !== 'string') throw new Error('Missing project cover path.')
      return {
        project: await updateProjectIdentity(params.gameId, {
          title: payload.title,
          description: payload.description,
          coverPath: payload.coverPath,
        }),
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/cover', async ({ body, params }) => {
    try {
      const payload = body as { cover?: unknown }
      if (!(payload.cover instanceof File)) throw new Error('Missing cover image.')
      return await uploadProjectCover(params.gameId, payload.cover)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
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
      return await listStoryEntries(params.gameId)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/story/folder', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing story folder path.')
      return await createStoryFolder(params.gameId, payload.path)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .patch('/api/projects/:gameId/story/folder', async ({ body, params }) => {
    try {
      const payload = body as { fromPath?: unknown; toPath?: unknown }
      if (typeof payload.fromPath !== 'string') throw new Error('Missing source story folder path.')
      if (typeof payload.toPath !== 'string') throw new Error('Missing target story folder path.')
      return await renameStoryFolder(params.gameId, payload.fromPath, payload.toPath)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .delete('/api/projects/:gameId/story/folder', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing story folder path.')
      return await deleteStoryFolder(params.gameId, payload.path)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
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
  .patch('/api/projects/:gameId/story/file', async ({ body, params }) => {
    try {
      const payload = body as { fromPath?: unknown; toPath?: unknown }
      if (typeof payload.fromPath !== 'string') throw new Error('Missing source story file path.')
      if (typeof payload.toPath !== 'string') throw new Error('Missing target story file path.')
      return await renameStoryFile(params.gameId, payload.fromPath, payload.toPath)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .delete('/api/projects/:gameId/story/file', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing story file path.')
      return await deleteStoryFile(params.gameId, payload.path)
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
  .get('/api/projects/:gameId/art-style', async ({ params }) => {
    try {
      return await listArtStyle(params.gameId)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/art-style', async ({ body, params }) => {
    try {
      const payload = body as { index?: unknown; image?: unknown }
      const index = Number(payload.index)
      if (!(payload.image instanceof File)) throw new Error('Missing art style image.')
      return await uploadArtStyleImage(params.gameId, index, payload.image)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .post('/api/projects/:gameId/art-style/generate', async ({ body, params }) => {
    try {
      const payload = body as { index?: unknown; prompt?: unknown }
      if (typeof payload.prompt !== 'string') throw new Error('Missing art style generation prompt.')
      return await generateArtStyleImage(params.gameId, Number(payload.index), payload.prompt)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .post('/api/projects/:gameId/art-style/edit', async ({ body, params }) => {
    try {
      const payload = body as { index?: unknown; prompt?: unknown }
      if (typeof payload.prompt !== 'string') throw new Error('Missing art style edit prompt.')
      return await editArtStyleImage(params.gameId, Number(payload.index), payload.prompt)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .delete('/api/projects/:gameId/art-style', async ({ body, params }) => {
    try {
      const payload = body as { index?: unknown }
      return await deleteArtStyleImage(params.gameId, Number(payload.index))
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .get('/api/projects/:gameId/builds', ({ params }) => {
    try {
      return getBuilds(params.gameId)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .post('/api/projects/:gameId/builds', async ({ body, params }) => {
    try {
      const payload = body as { mode?: unknown }
      return await runStudioBuild(params.gameId, payload.mode)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .get('/api/projects/:gameId/builds/manifest', ({ params }) => {
    try {
      return getBuildManifest(params.gameId)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .get('/api/projects/:gameId/authoring', async ({ params, query }) => {
    try {
      const search = typeof query['q'] === 'string' ? query['q'] : ''
      return await analyzeAuthoring(params.gameId, search)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .get('/api/projects/:gameId/settings', async ({ params }) => {
    try {
      return { settings: await readStudioSettings(params.gameId) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .put('/api/projects/:gameId/settings', async ({ body, params }) => {
    try {
      const payload = body as { settings?: unknown }
      if (typeof payload.settings !== 'object' || payload.settings === null || Array.isArray(payload.settings)) {
        throw new Error('Missing Studio settings payload.')
      }
      return { settings: await writeStudioSettings(params.gameId, payload.settings as Parameters<typeof writeStudioSettings>[1]) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/scenes', async ({ params }) => {
    try {
      return await listSceneEntries(params.gameId)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/scenes/folder', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing scene folder path.')
      return await createSceneFolder(params.gameId, payload.path)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .post('/api/projects/:gameId/scenes/file', async ({ body, params }) => {
    try {
      const payload = body as { folder?: unknown; name?: unknown; displayName?: unknown; file?: unknown }
      if (payload.file instanceof File) {
        return await uploadSceneFile(params.gameId, typeof payload.folder === 'string' ? payload.folder : '', payload.file)
      }
      if (typeof payload.name !== 'string') throw new Error('Missing scene name.')
      if (payload.displayName !== undefined && typeof payload.displayName !== 'string') {
        throw new Error('Scene display name must be text.')
      }
      return await createSceneFile(
        params.gameId,
        typeof payload.folder === 'string' ? payload.folder : '',
        payload.name,
        payload.displayName,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .post('/api/projects/:gameId/scenes/generate', async ({ body, params }) => {
    try {
      const payload = body as { options?: unknown }
      if (typeof payload.options !== 'object' || payload.options === null || Array.isArray(payload.options)) {
        throw new Error('Missing scene generation options.')
      }
      return await generateSceneFile(params.gameId, payload.options as Parameters<typeof generateSceneFile>[1])
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn(`[studio] scene generation failed: ${err.message}`)
      return jsonError(err.message, 400)
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
  .delete('/api/projects/:gameId/scenes/file', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing scene file path.')
      return await deleteSceneFile(params.gameId, payload.path)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/scenes/background-folder', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; scene?: unknown; folder?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing scene file path.')
      if (typeof payload.scene !== 'object' || payload.scene === null || Array.isArray(payload.scene)) {
        throw new Error('Missing scene payload.')
      }
      if (typeof payload.folder !== 'string') throw new Error('Missing scene background folder name.')
      return await createSceneBackgroundFolder(
        params.gameId,
        payload.path,
        payload.scene as Parameters<typeof createSceneBackgroundFolder>[2],
        payload.folder,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/scenes/background', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; scene?: unknown; image?: unknown; folder?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing scene file path.')
      if (!(payload.image instanceof File)) throw new Error('Missing scene background image.')
      const parsed = typeof payload.scene === 'string'
        ? JSON.parse(payload.scene) as unknown
        : payload.scene
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Invalid scene payload.')
      }
      return await uploadSceneBackground(
        params.gameId,
        payload.path,
        parsed as Parameters<typeof uploadSceneBackground>[2],
        payload.image,
        typeof payload.folder === 'string' ? payload.folder : undefined,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/scenes/background/generate', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; scene?: unknown; options?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing scene file path.')
      if (typeof payload.scene !== 'object' || payload.scene === null || Array.isArray(payload.scene)) {
        throw new Error('Missing scene payload.')
      }
      if (typeof payload.options !== 'object' || payload.options === null || Array.isArray(payload.options)) {
        throw new Error('Missing scene background generation options.')
      }
      return await generateSceneBackground(
        params.gameId,
        payload.path,
        payload.scene as Parameters<typeof generateSceneBackground>[2],
        payload.options as Parameters<typeof generateSceneBackground>[3],
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn(`[studio] scene background generation failed: ${err.message}`)
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/scenes/background/edit', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; scene?: unknown; assetPath?: unknown; prompt?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing scene file path.')
      if (typeof payload.scene !== 'object' || payload.scene === null || Array.isArray(payload.scene)) {
        throw new Error('Missing scene payload.')
      }
      if (typeof payload.assetPath !== 'string') throw new Error('Missing scene background asset path.')
      if (typeof payload.prompt !== 'string') throw new Error('Missing scene background edit instruction.')
      return await editSceneBackground(
        params.gameId,
        payload.path,
        payload.scene as Parameters<typeof editSceneBackground>[2],
        payload.assetPath,
        payload.prompt,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn(`[studio] scene background edit failed: ${err.message}`)
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .delete('/api/projects/:gameId/scenes/background', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; scene?: unknown; assetPath?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing scene file path.')
      if (typeof payload.scene !== 'object' || payload.scene === null || Array.isArray(payload.scene)) {
        throw new Error('Missing scene payload.')
      }
      if (typeof payload.assetPath !== 'string') throw new Error('Missing scene background asset path.')
      return await deleteSceneBackground(
        params.gameId,
        payload.path,
        payload.scene as Parameters<typeof deleteSceneBackground>[2],
        payload.assetPath,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/characters', async ({ params }) => {
    try {
      return { characters: await listCharacters(params.gameId) }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/characters/file', async ({ params, query }) => {
    try {
      const path = typeof query['path'] === 'string' ? query['path'] : ''
      return await readCharacter(params.gameId, path)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .put('/api/projects/:gameId/characters/file', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (typeof payload.character !== 'object' || payload.character === null || Array.isArray(payload.character)) {
        throw new Error('Missing character payload.')
      }
      return await writeCharacter(params.gameId, payload.path, payload.character as Parameters<typeof writeCharacter>[2])
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .delete('/api/projects/:gameId/characters/file', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      return await deleteCharacterFile(params.gameId, payload.path)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/characters/atlas', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (typeof payload.character !== 'object' || payload.character === null || Array.isArray(payload.character)) {
        throw new Error('Missing character payload.')
      }
      return await generateCharacterAtlas(params.gameId, payload.path, payload.character as Parameters<typeof generateCharacterAtlas>[2])
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/characters/character-sheet/concepts', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown; image?: unknown; artType?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (!(payload.image instanceof File)) throw new Error('Missing character sheet image.')
      const parsed = typeof payload.character === 'string'
        ? JSON.parse(payload.character) as unknown
        : payload.character
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Invalid character payload.')
      }
      return await uploadCharacterSheetConcept(
        params.gameId,
        payload.path,
        parsed as Parameters<typeof uploadCharacterSheetConcept>[2],
        payload.image,
        typeof payload.artType === 'string' ? payload.artType as Parameters<typeof uploadCharacterSheetConcept>[4] : undefined,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/characters/spritesheet-folder', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown; folder?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (typeof payload.character !== 'object' || payload.character === null || Array.isArray(payload.character)) {
        throw new Error('Missing character payload.')
      }
      if (typeof payload.folder !== 'string') throw new Error('Missing spritesheet folder name.')
      return await createCharacterSpritesheetFolder(
        params.gameId,
        payload.path,
        payload.character as Parameters<typeof createCharacterSpritesheetFolder>[2],
        payload.folder,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/characters/spritesheet', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown; image?: unknown; folder?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (!(payload.image instanceof File)) throw new Error('Missing spritesheet image.')
      const parsed = typeof payload.character === 'string'
        ? JSON.parse(payload.character) as unknown
        : payload.character
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Invalid character payload.')
      }
      return await uploadCharacterSpritesheet(
        params.gameId,
        payload.path,
        parsed as Parameters<typeof uploadCharacterSpritesheet>[2],
        payload.image,
        typeof payload.folder === 'string' ? payload.folder : undefined,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/characters/spritesheet/generate', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown; options?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (typeof payload.character !== 'object' || payload.character === null || Array.isArray(payload.character)) {
        throw new Error('Missing character payload.')
      }
      if (typeof payload.options !== 'object' || payload.options === null || Array.isArray(payload.options)) {
        throw new Error('Missing spritesheet generation options.')
      }
      return await generateCharacterSpritesheet(
        params.gameId,
        payload.path,
        payload.character as Parameters<typeof generateCharacterSpritesheet>[2],
        payload.options as Parameters<typeof generateCharacterSpritesheet>[3],
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn(`[studio] spritesheet generation failed: ${err.message}`)
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/characters/character-sheet/generate', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown; prompt?: unknown; artTypes?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (typeof payload.character !== 'object' || payload.character === null || Array.isArray(payload.character)) {
        throw new Error('Missing character payload.')
      }
      console.info(`[studio] character-sheet generate requested: game=${params.gameId} path=${payload.path}`)
      const result = await generateCharacterSheetConcept(
        params.gameId,
        payload.path,
        payload.character as Parameters<typeof generateCharacterSheetConcept>[2],
        typeof payload.prompt === 'string' ? payload.prompt : '',
        Array.isArray(payload.artTypes) ? payload.artTypes as Parameters<typeof generateCharacterSheetConcept>[4] : undefined,
      )
      console.info(`[studio] character-sheet generate completed: ${result.path}`)
      return result
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn(`[studio] character-sheet generate failed: ${err.message}`)
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/characters/character-sheet/edit', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown; assetPath?: unknown; prompt?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (typeof payload.character !== 'object' || payload.character === null || Array.isArray(payload.character)) {
        throw new Error('Missing character payload.')
      }
      if (typeof payload.assetPath !== 'string') throw new Error('Missing character sheet asset path.')
      if (typeof payload.prompt !== 'string') throw new Error('Missing edit prompt.')
      console.info(`[studio] character-sheet edit requested: game=${params.gameId} path=${payload.path} asset=${payload.assetPath}`)
      const result = await editCharacterSheetConcept(
        params.gameId,
        payload.path,
        payload.character as Parameters<typeof editCharacterSheetConcept>[2],
        payload.assetPath,
        payload.prompt,
      )
      console.info(`[studio] character-sheet edit completed: ${result.path}`)
      return result
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn(`[studio] character-sheet edit failed: ${err.message}`)
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .delete('/api/projects/:gameId/characters/character-sheet/concepts', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown; assetPath?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (typeof payload.character !== 'object' || payload.character === null || Array.isArray(payload.character)) {
        throw new Error('Missing character payload.')
      }
      if (typeof payload.assetPath !== 'string') throw new Error('Missing character sheet asset path.')
      return await deleteCharacterSheetConcept(
        params.gameId,
        payload.path,
        payload.character as Parameters<typeof deleteCharacterSheetConcept>[2],
        payload.assetPath,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .delete('/api/projects/:gameId/characters/spritesheet', async ({ body, params }) => {
    try {
      const payload = body as { path?: unknown; character?: unknown; assetPath?: unknown }
      if (typeof payload.path !== 'string') throw new Error('Missing character file path.')
      if (typeof payload.character !== 'object' || payload.character === null || Array.isArray(payload.character)) {
        throw new Error('Missing character payload.')
      }
      if (typeof payload.assetPath !== 'string') throw new Error('Missing spritesheet asset path.')
      return await deleteCharacterSpritesheet(
        params.gameId,
        payload.path,
        payload.character as Parameters<typeof deleteCharacterSpritesheet>[2],
        payload.assetPath,
      )
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('not found') ? 404 : 400)
    }
  })
  .get('/api/projects/:gameId/plugins', async ({ params }) => {
    try {
      return await listStudioPlugins(params.gameId)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, err.message.includes('does not exist') ? 404 : 400)
    }
  })
  .post('/api/projects/:gameId/plugins/install', async ({ body, params }) => {
    try {
      const payload = body as { importName?: unknown }
      if (typeof payload.importName !== 'string') throw new Error('Missing official plugin importName.')
      return await installOfficialPlugin(params.gameId, payload.importName)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .post('/api/projects/:gameId/plugins/remove', async ({ body, params }) => {
    try {
      const payload = body as { importName?: unknown }
      if (typeof payload.importName !== 'string') throw new Error('Missing official plugin importName.')
      return await removeOfficialPlugin(params.gameId, payload.importName)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
    }
  })
  .all('/*', ({ request }) => {
    const url = new URL(request.url)
    const match = /^\/api\/projects\/([^/]+)\/preview(?:\/(.*))?$/.exec(url.pathname)
    if (!match) return jsonError('Not found', 404)
    const gameId = decodeURIComponent(match[1] ?? '')
    try {
      const filePath = resolvePreviewFile(gameId, request.url)
      if (!previewFileExists(filePath)) return jsonError('Preview file not found. Run a build first.', 404)
      return new Response(Bun.file(filePath), { headers: { 'Content-Type': previewMime(filePath) } })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return jsonError(err.message, 400)
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
  console.log(`Biwa Studio API listening on http://${hostname}:${port}`)
}
