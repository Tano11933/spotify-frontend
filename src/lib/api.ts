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
  Page,
  Playlist,
  SearchResults,
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

  refresh: (refreshToken: string) =>
    api
      .post<TokenPair>('/auth/refresh', { refresh_token: refreshToken })
      .then((res) => res.data),

  logout: () => api.post<MessageResponse>('/auth/logout').then((res) => res.data),

  me: () => api.get<User>('/auth/me').then((res) => res.data),

  forgotPassword: (payload: { email: string }) =>
    api.post<MessageResponse>('/auth/forgot-password', payload).then((res) => res.data),

  resetPassword: (payload: { token: string; new_password: string }) =>
    api.post<MessageResponse>('/auth/reset-password', payload).then((res) => res.data),
}

/** Parameter pagination standar backend (default limit 20, maks 100). */
export interface ListParams {
  limit?: number
  offset?: number
}

export const catalogApi = {
  getArtists: (params?: ListParams) =>
    api.get<Page<Artist>>('/artists', { params }).then((res) => res.data),
  getArtist: (id: number) => api.get<Artist>(`/artists/${id}`).then((res) => res.data),
  getArtistSongs: (id: number, params?: ListParams) =>
    api.get<Page<Song>>(`/artists/${id}/songs`, { params }).then((res) => res.data),

  getAlbums: (params?: ListParams) =>
    api.get<Page<Album>>('/albums', { params }).then((res) => res.data),
  getAlbum: (id: number) => api.get<Album>(`/albums/${id}`).then((res) => res.data),

  getSongs: (params?: ListParams) =>
    api.get<Page<Song>>('/songs', { params }).then((res) => res.data),
  getSong: (id: number) => api.get<Song>(`/songs/${id}`).then((res) => res.data),
}

export const searchApi = {
  search: (params: { q: string; type?: string } & ListParams) =>
    api.get<SearchResults>('/search', { params }).then((res) => res.data),
}

export const playlistApi = {
  getMine: (params?: ListParams) =>
    api.get<Page<Playlist>>('/playlists', { params }).then((res) => res.data),
  getPublic: (params?: ListParams) =>
    api.get<Page<Playlist>>('/playlists/public', { params }).then((res) => res.data),
  getById: (id: number) => api.get<Playlist>(`/playlists/${id}`).then((res) => res.data),
  create: (payload: { name: string; description: string; is_public: boolean }) =>
    api.post<Playlist>('/playlists', payload).then((res) => res.data),
  update: (id: number, payload: Partial<Pick<Playlist, 'name' | 'description' | 'is_public'>>) =>
    api.put<Playlist>(`/playlists/${id}`, payload).then((res) => res.data),
  delete: (id: number) => api.delete<MessageResponse>(`/playlists/${id}`).then((res) => res.data),
  addSong: (id: number, songId: number) =>
    api.post<MessageResponse>(`/playlists/${id}/songs`, { song_id: songId }).then((res) => res.data),
  removeSong: (id: number, songId: number) =>
    api.delete<MessageResponse>(`/playlists/${id}/songs/${songId}`).then((res) => res.data),
}

/**
 * Pustaka pribadi user. Endpoint `contains` menerima daftar id (maks 100) dan
 * mengembalikan map id→boolean — dipakai untuk menyalakan ikon hati tanpa
 * satu request per item.
 */
export const libraryApi = {
  getTracks: (params?: ListParams) =>
    api.get<Page<Song>>('/me/tracks', { params }).then((res) => res.data),
  saveTrack: (songId: number) =>
    api.put<MessageResponse>(`/me/tracks/${songId}`).then((res) => res.data),
  removeTrack: (songId: number) =>
    api.delete<MessageResponse>(`/me/tracks/${songId}`).then((res) => res.data),
  tracksContain: (ids: number[]) =>
    api
      .get<Record<string, boolean>>('/me/tracks/contains', { params: { ids: ids.join(',') } })
      .then((res) => res.data),

  getAlbums: (params?: ListParams) =>
    api.get<Page<Album>>('/me/albums', { params }).then((res) => res.data),
  saveAlbum: (albumId: number) =>
    api.put<MessageResponse>(`/me/albums/${albumId}`).then((res) => res.data),
  removeAlbum: (albumId: number) =>
    api.delete<MessageResponse>(`/me/albums/${albumId}`).then((res) => res.data),
  albumsContain: (ids: number[]) =>
    api
      .get<Record<string, boolean>>('/me/albums/contains', { params: { ids: ids.join(',') } })
      .then((res) => res.data),

  getFollowing: (params?: ListParams) =>
    api.get<Page<Artist>>('/me/following', { params }).then((res) => res.data),
  followArtist: (artistId: number) =>
    api.put<MessageResponse>(`/me/following/${artistId}`).then((res) => res.data),
  unfollowArtist: (artistId: number) =>
    api.delete<MessageResponse>(`/me/following/${artistId}`).then((res) => res.data),
  followingContain: (ids: number[]) =>
    api
      .get<Record<string, boolean>>('/me/following/contains', { params: { ids: ids.join(',') } })
      .then((res) => res.data),
}

export const adminApi = {
  createArtist: (payload: Pick<Artist, 'name' | 'bio' | 'image_url'>) =>
    api.post<Artist>('/artists', payload).then((res) => res.data),
  updateArtist: (id: number, payload: Partial<Pick<Artist, 'name' | 'bio' | 'image_url'>>) =>
    api.put<Artist>(`/artists/${id}`, payload).then((res) => res.data),
  deleteArtist: (id: number) => api.delete<MessageResponse>(`/artists/${id}`).then((res) => res.data),
  createAlbum: (payload: Pick<Album, 'title' | 'cover_url' | 'release_date' | 'artist_id'>) =>
    api.post<Album>('/albums', payload).then((res) => res.data),
  updateAlbum: (id: number, payload: Partial<Pick<Album, 'title' | 'cover_url' | 'release_date' | 'artist_id'>>) =>
    api.put<Album>(`/albums/${id}`, payload).then((res) => res.data),
  deleteAlbum: (id: number) => api.delete<MessageResponse>(`/albums/${id}`).then((res) => res.data),
  createSong: (payload: Pick<Song, 'title' | 'duration' | 'file_url' | 'artist_id'> & { album_id?: number | null }) =>
    api.post<Song>('/songs', payload).then((res) => res.data),
  updateSong: (id: number, payload: Partial<Pick<Song, 'title' | 'duration' | 'file_url' | 'artist_id' | 'album_id'>>) =>
    api.put<Song>(`/songs/${id}`, payload).then((res) => res.data),
  deleteSong: (id: number) => api.delete<MessageResponse>(`/songs/${id}`).then((res) => res.data),
}
