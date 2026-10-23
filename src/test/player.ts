import type { Song } from '@/types'

export function makeSong(id = 1): Song {
  return {
    id, title: `Audio fixture ${id}`, duration: 120,
    file_url: `https://example.invalid/audio-${id}.wav`,
    artist_id: 1, album_id: null, created_at: '', updated_at: '',
  }
}
