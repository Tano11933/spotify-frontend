import type { Song } from '@/types'

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
  PONG: 'pong',
  ERROR: 'error',
} as const

export type SongCreatedPayload = Song
export interface SongPlayingPayload {
  song: Song
}
export interface WsErrorPayload {
  message: string
}
