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

/** Bentuk error yang KONSISTEN di seluruh backend: {"error": "pesan singkat"}. */
export interface ApiErrorResponse {
  error: string
}
