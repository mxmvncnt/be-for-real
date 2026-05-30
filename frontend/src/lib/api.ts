export type HealthResponse = {
  ok: boolean
  service: string
  timestamp: string
}

export type RegisterPayload = {
  username: string
  email: string
  password: string
}

export type RegisterResponse = {
  id: string
  username: string
  email: string
}

export type LoginPayload = {
  email: string
  password: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  login: (payload: LoginPayload) =>
    request<string>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload: RegisterPayload) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
