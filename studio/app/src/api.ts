import type {
  StudioDoctorResponse,
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
