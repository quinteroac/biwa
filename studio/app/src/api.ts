import type {
  StudioDoctorResponse,
  StudioAssetsResponse,
  StudioArtStyleMutationResponse,
  StudioArtStyleResponse,
  StudioAuthoringAnalysisResponse,
  StudioBuildMode,
  StudioBuildResponse,
  StudioBuildsResponse,
  StudioCharacterAtlasResponse,
  StudioCharacterDeleteResponse,
  StudioCharacterDraft,
  StudioCharacterSheetEditResponse,
  StudioCharacterResponse,
  StudioCharacterSpritesheetDeleteResponse,
  StudioCharacterSpritesheetFolderResponse,
  StudioCharacterSpritesheetGenerateRequest,
  StudioCharacterSpritesheetGenerateResponse,
  StudioCharacterSpritesheetUploadResponse,
  StudioCharacterSheetArtType,
  StudioCharacterSheetDeleteResponse,
  StudioCharacterSheetGenerateResponse,
  StudioCharacterSheetUploadResponse,
  StudioCharactersResponse,
  StudioSceneDraft,
  StudioSceneBackgroundDeleteResponse,
  StudioSceneBackgroundEditResponse,
  StudioSceneBackgroundFolderResponse,
  StudioSceneBackgroundGenerateRequest,
  StudioSceneBackgroundGenerateResponse,
  StudioSceneBackgroundUploadResponse,
  StudioSceneFileMutationResponse,
  StudioSceneFolderResponse,
  StudioSceneGenerateRequest,
  StudioSceneResponse,
  StudioScenesResponse,
  StudioPluginMutationResponse,
  StudioPluginsResponse,
  StudioProjectCreateRequest,
  StudioProjectCreateResponse,
  StudioProjectCoverUploadResponse,
  StudioProjectIdentityDraft,
  StudioProjectResponse,
  StudioProjectsResponse,
  StudioSettings,
  StudioSettingsResponse,
  StudioManifestResponse,
  StudioStoryListResponse,
  StudioStoryResponse,
} from '../../shared/types.ts'

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const data = await response.json() as unknown
  if (!response.ok) {
    const message = typeof data === 'object'
      && data !== null
      && 'error' in data
      && typeof data.error === 'string'
      ? data.error
      : `Request failed with ${response.status}`
    throw new Error(message)
  }
  return data as T
}

export function fetchProjects(): Promise<StudioProjectsResponse> {
  return requestJson<StudioProjectsResponse>('/api/projects')
}

export function fetchProject(gameId: string): Promise<StudioProjectResponse> {
  return requestJson<StudioProjectResponse>(`/api/projects/${gameId}`)
}

export function createProject(draft: StudioProjectCreateRequest): Promise<StudioProjectCreateResponse> {
  return requestJson<StudioProjectCreateResponse>('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
}

export function saveProjectIdentity(gameId: string, draft: StudioProjectIdentityDraft): Promise<StudioProjectResponse> {
  return requestJson<StudioProjectResponse>(`/api/projects/${gameId}/identity`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
}

export function uploadProjectCover(gameId: string, cover: File): Promise<StudioProjectCoverUploadResponse> {
  const body = new FormData()
  body.set('cover', cover)
  return requestJson<StudioProjectCoverUploadResponse>(`/api/projects/${gameId}/cover`, {
    method: 'POST',
    body,
  })
}

export function fetchArtStyle(gameId: string): Promise<StudioArtStyleResponse> {
  return requestJson<StudioArtStyleResponse>(`/api/projects/${gameId}/art-style`)
}

export function uploadArtStyleImage(gameId: string, index: number, image: File): Promise<StudioArtStyleMutationResponse> {
  const body = new FormData()
  body.set('index', String(index))
  body.set('image', image)
  return requestJson<StudioArtStyleMutationResponse>(`/api/projects/${gameId}/art-style`, {
    method: 'POST',
    body,
  })
}

export function generateArtStyleImage(gameId: string, index: number, prompt: string): Promise<StudioArtStyleMutationResponse> {
  return requestJson<StudioArtStyleMutationResponse>(`/api/projects/${gameId}/art-style/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, prompt }),
  })
}

export function editArtStyleImage(gameId: string, index: number, prompt: string): Promise<StudioArtStyleMutationResponse> {
  return requestJson<StudioArtStyleMutationResponse>(`/api/projects/${gameId}/art-style/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, prompt }),
  })
}

export function deleteArtStyleImage(gameId: string, index: number): Promise<StudioArtStyleMutationResponse> {
  return requestJson<StudioArtStyleMutationResponse>(`/api/projects/${gameId}/art-style`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index }),
  })
}

export function runDoctor(gameId: string): Promise<StudioDoctorResponse> {
  return requestJson<StudioDoctorResponse>(`/api/projects/${gameId}/doctor`, { method: 'POST' })
}

export function fetchAuthoringAnalysis(gameId: string, query = ''): Promise<StudioAuthoringAnalysisResponse> {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  return requestJson<StudioAuthoringAnalysisResponse>(`/api/projects/${gameId}/authoring${suffix}`)
}

export function fetchStudioSettings(gameId: string): Promise<StudioSettingsResponse> {
  return requestJson<StudioSettingsResponse>(`/api/projects/${gameId}/settings`)
}

export function saveStudioSettings(gameId: string, settings: StudioSettings): Promise<StudioSettingsResponse> {
  return requestJson<StudioSettingsResponse>(`/api/projects/${gameId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  })
}

export function fetchBuilds(gameId: string): Promise<StudioBuildsResponse> {
  return requestJson<StudioBuildsResponse>(`/api/projects/${gameId}/builds`)
}

export function runBuild(gameId: string, mode: StudioBuildMode): Promise<StudioBuildResponse> {
  return requestJson<StudioBuildResponse>(`/api/projects/${gameId}/builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
}

export function fetchBuildManifest(gameId: string): Promise<StudioManifestResponse> {
  return requestJson<StudioManifestResponse>(`/api/projects/${gameId}/builds/manifest`)
}

export function fetchStoryFiles(gameId: string): Promise<StudioStoryListResponse> {
  return requestJson<StudioStoryListResponse>(`/api/projects/${gameId}/story`)
}

export function fetchStoryFile(gameId: string, path: string): Promise<StudioStoryResponse> {
  return requestJson<StudioStoryResponse>(`/api/projects/${gameId}/story/file?path=${encodeURIComponent(path)}`)
}

export function createStoryFolder(gameId: string, path: string): Promise<StudioStoryListResponse> {
  return requestJson<StudioStoryListResponse>(`/api/projects/${gameId}/story/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

export function renameStoryFolder(gameId: string, fromPath: string, toPath: string): Promise<StudioStoryListResponse> {
  return requestJson<StudioStoryListResponse>(`/api/projects/${gameId}/story/folder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromPath, toPath }),
  })
}

export function deleteStoryFolder(gameId: string, path: string): Promise<StudioStoryListResponse> {
  return requestJson<StudioStoryListResponse>(`/api/projects/${gameId}/story/folder`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

export function saveStoryFile(gameId: string, path: string, content: string): Promise<StudioStoryResponse> {
  return requestJson<StudioStoryResponse>(`/api/projects/${gameId}/story/file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  })
}

export function renameStoryFile(gameId: string, fromPath: string, toPath: string): Promise<StudioStoryResponse> {
  return requestJson<StudioStoryResponse>(`/api/projects/${gameId}/story/file`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromPath, toPath }),
  })
}

export function deleteStoryFile(gameId: string, path: string): Promise<StudioStoryListResponse> {
  return requestJson<StudioStoryListResponse>(`/api/projects/${gameId}/story/file`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

export function fetchAssets(gameId: string): Promise<StudioAssetsResponse> {
  return requestJson<StudioAssetsResponse>(`/api/projects/${gameId}/assets`)
}

export function fetchScenes(gameId: string): Promise<StudioScenesResponse> {
  return requestJson<StudioScenesResponse>(`/api/projects/${gameId}/scenes`)
}

export function fetchScene(gameId: string, path: string): Promise<StudioSceneResponse> {
  return requestJson<StudioSceneResponse>(`/api/projects/${gameId}/scenes/file?path=${encodeURIComponent(path)}`)
}

export function createSceneFolder(gameId: string, path: string): Promise<StudioSceneFolderResponse> {
  return requestJson<StudioSceneFolderResponse>(`/api/projects/${gameId}/scenes/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

export function createSceneFile(gameId: string, folder: string, name: string, displayName?: string): Promise<StudioSceneFileMutationResponse> {
  return requestJson<StudioSceneFileMutationResponse>(`/api/projects/${gameId}/scenes/file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder,
      name,
      ...(displayName ? { displayName } : {}),
    }),
  })
}

export function uploadSceneFile(gameId: string, folder: string, file: File): Promise<StudioSceneFileMutationResponse> {
  const body = new FormData()
  body.set('folder', folder)
  body.set('file', file)
  return requestJson<StudioSceneFileMutationResponse>(`/api/projects/${gameId}/scenes/file`, {
    method: 'POST',
    body,
  })
}

export function generateSceneFile(gameId: string, options: StudioSceneGenerateRequest): Promise<StudioSceneFileMutationResponse> {
  return requestJson<StudioSceneFileMutationResponse>(`/api/projects/${gameId}/scenes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ options }),
  })
}

export function deleteSceneFile(gameId: string, path: string): Promise<StudioScenesResponse> {
  return requestJson<StudioScenesResponse>(`/api/projects/${gameId}/scenes/file`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

export function saveScene(gameId: string, path: string, scene: StudioSceneDraft): Promise<StudioSceneResponse> {
  return requestJson<StudioSceneResponse>(`/api/projects/${gameId}/scenes/file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, scene }),
  })
}

export function createSceneBackgroundFolder(
  gameId: string,
  path: string,
  scene: StudioSceneDraft,
  folder: string,
): Promise<StudioSceneBackgroundFolderResponse> {
  return requestJson<StudioSceneBackgroundFolderResponse>(`/api/projects/${gameId}/scenes/background-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, scene, folder }),
  })
}

export function uploadSceneBackground(
  gameId: string,
  path: string,
  scene: StudioSceneDraft,
  image: File,
  folder: string,
): Promise<StudioSceneBackgroundUploadResponse> {
  const body = new FormData()
  body.set('path', path)
  body.set('scene', JSON.stringify(scene))
  body.set('image', image)
  body.set('folder', folder)
  return requestJson<StudioSceneBackgroundUploadResponse>(`/api/projects/${gameId}/scenes/background`, {
    method: 'POST',
    body,
  })
}

export function generateSceneBackground(
  gameId: string,
  path: string,
  scene: StudioSceneDraft,
  options: StudioSceneBackgroundGenerateRequest,
): Promise<StudioSceneBackgroundGenerateResponse> {
  return requestJson<StudioSceneBackgroundGenerateResponse>(`/api/projects/${gameId}/scenes/background/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, scene, options }),
  })
}

export function editSceneBackground(
  gameId: string,
  path: string,
  scene: StudioSceneDraft,
  assetPath: string,
  prompt: string,
): Promise<StudioSceneBackgroundEditResponse> {
  return requestJson<StudioSceneBackgroundEditResponse>(`/api/projects/${gameId}/scenes/background/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, scene, assetPath, prompt }),
  })
}

export function deleteSceneBackground(
  gameId: string,
  path: string,
  scene: StudioSceneDraft,
  assetPath: string,
): Promise<StudioSceneBackgroundDeleteResponse> {
  return requestJson<StudioSceneBackgroundDeleteResponse>(`/api/projects/${gameId}/scenes/background`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, scene, assetPath }),
  })
}

export function fetchCharacters(gameId: string): Promise<StudioCharactersResponse> {
  return requestJson<StudioCharactersResponse>(`/api/projects/${gameId}/characters`)
}

export function fetchCharacter(gameId: string, path: string): Promise<StudioCharacterResponse> {
  return requestJson<StudioCharacterResponse>(`/api/projects/${gameId}/characters/file?path=${encodeURIComponent(path)}`)
}

export function saveCharacter(gameId: string, path: string, character: StudioCharacterDraft): Promise<StudioCharacterResponse> {
  return requestJson<StudioCharacterResponse>(`/api/projects/${gameId}/characters/file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, character }),
  })
}

export function deleteCharacter(gameId: string, path: string): Promise<StudioCharacterDeleteResponse> {
  return requestJson<StudioCharacterDeleteResponse>(`/api/projects/${gameId}/characters/file`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
}

export function generateCharacterAtlas(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
): Promise<StudioCharacterAtlasResponse> {
  return requestJson<StudioCharacterAtlasResponse>(`/api/projects/${gameId}/characters/atlas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, character }),
  })
}

export function deleteCharacterSpritesheet(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
  assetPath: string,
): Promise<StudioCharacterSpritesheetDeleteResponse> {
  return requestJson<StudioCharacterSpritesheetDeleteResponse>(`/api/projects/${gameId}/characters/spritesheet`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, character, assetPath }),
  })
}

export function uploadCharacterSpritesheet(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
  image: File,
  folder: string,
): Promise<StudioCharacterSpritesheetUploadResponse> {
  const body = new FormData()
  body.set('path', path)
  body.set('character', JSON.stringify(character))
  body.set('image', image)
  body.set('folder', folder)
  return requestJson<StudioCharacterSpritesheetUploadResponse>(`/api/projects/${gameId}/characters/spritesheet`, {
    method: 'POST',
    body,
  })
}

export function createCharacterSpritesheetFolder(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
  folder: string,
): Promise<StudioCharacterSpritesheetFolderResponse> {
  return requestJson<StudioCharacterSpritesheetFolderResponse>(`/api/projects/${gameId}/characters/spritesheet-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, character, folder }),
  })
}

export function generateCharacterSpritesheet(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
  options: StudioCharacterSpritesheetGenerateRequest,
): Promise<StudioCharacterSpritesheetGenerateResponse> {
  return requestJson<StudioCharacterSpritesheetGenerateResponse>(`/api/projects/${gameId}/characters/spritesheet/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, character, options }),
  })
}

export function uploadCharacterSheetConcept(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
  image: File,
  artType?: StudioCharacterSheetArtType,
): Promise<StudioCharacterSheetUploadResponse> {
  const body = new FormData()
  body.set('path', path)
  body.set('character', JSON.stringify(character))
  body.set('image', image)
  if (artType) body.set('artType', artType)
  return requestJson<StudioCharacterSheetUploadResponse>(`/api/projects/${gameId}/characters/character-sheet/concepts`, {
    method: 'POST',
    body,
  })
}

export function generateCharacterSheetConcept(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
  prompt: string,
  artTypes: StudioCharacterSheetArtType[],
): Promise<StudioCharacterSheetGenerateResponse> {
  return requestJson<StudioCharacterSheetGenerateResponse>(`/api/projects/${gameId}/characters/character-sheet/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, character, prompt, artTypes }),
  })
}

export function editCharacterSheetConcept(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
  assetPath: string,
  prompt: string,
): Promise<StudioCharacterSheetEditResponse> {
  return requestJson<StudioCharacterSheetEditResponse>(`/api/projects/${gameId}/characters/character-sheet/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, character, assetPath, prompt }),
  })
}

export function deleteCharacterSheetConcept(
  gameId: string,
  path: string,
  character: StudioCharacterDraft,
  assetPath: string,
): Promise<StudioCharacterSheetDeleteResponse> {
  return requestJson<StudioCharacterSheetDeleteResponse>(`/api/projects/${gameId}/characters/character-sheet/concepts`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, character, assetPath }),
  })
}

export function fetchPlugins(gameId: string): Promise<StudioPluginsResponse> {
  return requestJson<StudioPluginsResponse>(`/api/projects/${gameId}/plugins`)
}

export function installPlugin(gameId: string, importName: string): Promise<StudioPluginMutationResponse> {
  return requestJson<StudioPluginMutationResponse>(`/api/projects/${gameId}/plugins/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ importName }),
  })
}

export function removePlugin(gameId: string, importName: string): Promise<StudioPluginMutationResponse> {
  return requestJson<StudioPluginMutationResponse>(`/api/projects/${gameId}/plugins/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ importName }),
  })
}
