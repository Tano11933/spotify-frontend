import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import { env } from '@/lib/env'
import type {
  Album,
  ApiErrorResponse,
  Artist,
  AuthResponse,
  MessageResponse,
  Song,
  TokenPair,
  User,
} from '@/types'

export const api = axios.create({
  baseURL: `${env.VITE_API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

export interface AuthBridge {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  onTokensRefreshed: (tokens: TokenPair) => void
  onAuthFailure: () => void
}

let authBridge: AuthBridge | null = null

export function configureAuthBridge(bridge: AuthBridge): void {
  authBridge = bridge
}

api.interceptors.request.use((config) => {
  const accessToken = authBridge?.getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<TokenPair> | null = null

async function refreshAccessToken(): Promise<TokenPair> {
  const refreshToken = authBridge?.getRefreshToken()

  if (!refreshToken) {
    throw new Error('no refresh token available')
  }

  const response = await axios.post<TokenPair>(
    `${env.VITE_API_BASE_URL}/api/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 },
  )

  return response.data
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,

  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const config = error.config as RetriableConfig
    const status = error.response?.status
    const url = config.url ?? ''

    const shouldAttemptRefresh =
      status === 401 &&
      !config._retry &&
      !NO_REFRESH_PATHS.some((path) => url.startsWith(path)) &&
      Boolean(authBridge?.getRefreshToken())

    if (!shouldAttemptRefresh) {
      return Promise.reject(error)
    }

    config._retry = true

    try {
      refreshPromise ??= refreshAccessToken()
      const tokens = await refreshPromise

      authBridge?.onTokensRefreshed(tokens)

      config.headers.Authorization = `Bearer ${tokens.access_token}`
      return await api.request(config)
    } catch (refreshError) {
      authBridge?.onAuthFailure()
      return Promise.reject(refreshError)
    } finally {
      refreshPromise = null
    }
  },
)

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Terjadi kesalahan. Coba lagi sebentar lagi.',
): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback
  }

  const axiosError = error as AxiosError<ApiErrorResponse>

  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED') {
      return 'Permintaan terlalu lama. Periksa koneksi kamu lalu coba lagi.'
    }
    return 'Tidak bisa terhubung ke server. Pastikan backend sedang berjalan.'
  }

  const serverMessage = axiosError.response.data?.error
  if (typeof serverMessage === 'string' && serverMessage.length > 0) {
    return serverMessage
  }

  if (axiosError.response.status === 429) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  }

  return fallback
}

export const authApi = {
  register: (payload: { name: string; email: string; password: string }) =>
    api.post<User>('/auth/register', payload).then((res) => res.data),

  login: (payload: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', payload).then((res) => res.data),

  logout: () => api.post<MessageResponse>('/auth/logout').then((res) => res.data),

  me: () => api.get<User>('/auth/me').then((res) => res.data),

  forgotPassword: (payload: { email: string }) =>
    api.post<MessageResponse>('/auth/forgot-password', payload).then((res) => res.data),

  resetPassword: (payload: { token: string; new_password: string }) =>
    api.post<MessageResponse>('/auth/reset-password', payload).then((res) => res.data),
}

export const catalogApi = {
  getArtists: () => api.get<Artist[]>('/artists').then((res) => res.data),
  getArtist: (id: number) => api.get<Artist>(`/artists/${id}`).then((res) => res.data),
  getArtistSongs: (id: number) =>
    api.get<Song[]>(`/artists/${id}/songs`).then((res) => res.data),

  getAlbums: () => api.get<Album[]>('/albums').then((res) => res.data),
  getAlbum: (id: number) => api.get<Album>(`/albums/${id}`).then((res) => res.data),

  getSongs: () => api.get<Song[]>('/songs').then((res) => res.data),
  getSong: (id: number) => api.get<Song>(`/songs/${id}`).then((res) => res.data),
}
