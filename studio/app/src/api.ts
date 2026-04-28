import type {
  StudioDoctorResponse,
  StudioProjectResponse,
  StudioProjectsResponse,
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
