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

/** Kategori musik dari GET /api/genres. */
export interface Genre {
  id: number
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface Artist {
  id: number
  name: string
  bio: string
  image_url: string
  /** Hanya terisi di detail artist (endpoint list tidak memuat genre). */
  genres?: Genre[]
  created_at: string
  updated_at: string
}

/** Lagu di chart: field Song + jumlah putar 7 hari terakhir. */
export interface ChartSong extends Song {
  plays: number
}

/** Artist di chart: field Artist + total putar lagu-lagunya. */
export interface ChartArtist extends Artist {
  plays: number
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

/** State pemutaran dari server. `song` null berarti user belum pernah memutar. */
export interface PlayerState {
  song: Song | null
  position_seconds: number
  updated_at?: string
}

/** Satu entri riwayat putar dari GET /api/me/history. */
export interface HistoryEntry {
  played_at: string
  song: Song
}

/** Ringkasan user publik (tanpa email) dari endpoint /api/users. */
export interface PublicUser {
  id: UserID
  name: string
  created_at: string
}

/** Profil publik + statistik sosial dan status follow viewer. */
export interface PublicProfile extends PublicUser {
  followers: number
  following: number
  public_playlists: number
  is_following: boolean
}

/** Satu notifikasi in-app. `read_at` kosong berarti belum dibaca. */
export interface NotificationEntry {
  id: number
  type: 'user_followed'
  created_at: string
  actor?: PublicUser
  read_at?: string
}

/**
 * Halaman notifikasi. Backend menambahkan `unread` ke envelope standar supaya
 * lonceng bisa menampilkan badge tanpa request terpisah.
 */
export interface NotificationPage extends Page<NotificationEntry> {
  unread: number
}

/**
 * Satu aktivitas di feed: lagu yang diputar atau playlist publik yang dibuat
 * user yang kita ikuti. Objek yang relevan ikut dirakit backend.
 */
export interface FeedEntry {
  type: 'song_played' | 'playlist_created'
  created_at: string
  user: PublicUser
  song?: Song
  playlist?: Playlist
}
