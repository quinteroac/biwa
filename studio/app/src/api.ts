import type {
  StudioDoctorResponse,
  StudioAssetsResponse,
  StudioCharacterAtlasResponse,
  StudioCharacterDraft,
  StudioCharacterResponse,
  StudioCharactersResponse,
  StudioSceneDraft,
  StudioSceneResponse,
  StudioScenesResponse,
  StudioPluginMutationResponse,
  StudioPluginsResponse,
  StudioProjectResponse,
  StudioProjectsResponse,
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

export function runDoctor(gameId: string): Promise<StudioDoctorResponse> {
  return requestJson<StudioDoctorResponse>(`/api/projects/${gameId}/doctor`, { method: 'POST' })
}

export function fetchStoryFiles(gameId: string): Promise<StudioStoryListResponse> {
  return requestJson<StudioStoryListResponse>(`/api/projects/${gameId}/story`)
}

export function fetchStoryFile(gameId: string, path: string): Promise<StudioStoryResponse> {
  return requestJson<StudioStoryResponse>(`/api/projects/${gameId}/story/file?path=${encodeURIComponent(path)}`)
}

export function saveStoryFile(gameId: string, path: string, content: string): Promise<StudioStoryResponse> {
  return requestJson<StudioStoryResponse>(`/api/projects/${gameId}/story/file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
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

export function saveScene(gameId: string, path: string, scene: StudioSceneDraft): Promise<StudioSceneResponse> {
  return requestJson<StudioSceneResponse>(`/api/projects/${gameId}/scenes/file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, scene }),
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
