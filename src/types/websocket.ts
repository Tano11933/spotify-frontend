import type { NotificationEntry, Song } from '@/types'

export interface WsEvent<TPayload = unknown> {
  type: string
  payload?: TPayload
  user_id?: string
  at: string
}

export const WS_EVENT = {
  CONNECTION_ACK: 'connection:ack',
  SONG_CREATED: 'song:created',
  SONG_PLAYING: 'song:playing',
  NOTIFICATION_NEW: 'notification:new',
  PONG: 'pong',
  ERROR: 'error',
} as const

export type SongCreatedPayload = Song
export interface SongPlayingPayload {
  song: Song
}

/** Event notification:new dikirim TERTARGET ke user penerima, bukan broadcast. */
export interface NotificationNewPayload {
  notification: NotificationEntry
}

export interface WsErrorPayload {
  message: string
}
