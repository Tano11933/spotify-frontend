export type UserID = string

export type Role = 'user' | 'admin'

export interface User {
  id: UserID
  name: string
  email: string
  role: Role
  created_at: string
  updated_at: string
}

export interface Artist {
  id: number
  name: string
  bio: string
  image_url: string
  created_at: string
  updated_at: string
}

export interface Album {
  id: number
  title: string
  cover_url: string
  release_date: string
  artist_id: number
  artist?: Artist
  songs?: Song[]
  created_at: string
  updated_at: string
}

export interface Song {
  id: number
  title: string
  duration: number
  file_url: string
  artist_id: number
  artist?: Artist
  album_id: number | null
  album?: Album
  created_at: string
  updated_at: string
}

export interface Playlist {
  id: number
  name: string
  description: string
  is_public: boolean
  user_id: UserID
  user?: User
  songs?: Song[]
  created_at: string
  updated_at: string
}

/** Response POST /api/auth/login dan /api/auth/refresh. */
export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

/** Response POST /api/auth/login. */
export interface AuthResponse {
  user: User
  tokens: TokenPair
}

/** Response endpoint yang tidak mengembalikan data (logout, forgot-password, dll). */
export interface MessageResponse {
  message: string
}

/** Envelope pagination — bentuk response semua endpoint list backend. */
export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

/** Satu kesalahan validasi dari backend (`details` pada response 400). */
export interface FieldError {
  field: string
  rule: string
}

/**
 * Bentuk error backend: {"error": "...", "code": "..."} — `code` machine-readable
 * (VALIDATION_FAILED, UNAUTHORIZED, NOT_FOUND, dst) dan `details` hanya ada
 * untuk kegagalan validasi.
 */
export interface ApiErrorResponse {
  error: string
  code?: string
  details?: FieldError[]
}

/** Hasil GET /api/search — grup yang tidak diminta tidak dikirim backend. */
export interface SearchResults {
  tracks?: Page<Song>
  artists?: Page<Artist>
  albums?: Page<Album>
  playlists?: Page<Playlist>
}
