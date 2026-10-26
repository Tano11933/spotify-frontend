import { create } from 'zustand'

import type { QueueReservation, Song } from '@/types'

interface PlayerState {
  currentSong: Song | null
  /** Daftar lagu tempat next/previous bergerak (mis. isi satu album). */
  queue: Song[]
  isPlaying: boolean
  /** Posisi pemutaran dalam detik. */
  progress: number
  /** 0..1 */
  volume: number
  audioElement: HTMLAudioElement | null
  /** Changes even when the same Song object is selected again. */
  playbackVersion: number
  contextIndex: number
  queueReservation: (QueueReservation & { ownerId: string; status: 'pending' | 'confirmed' | 'released' }) | null
  audioStarted: { version: number; userId: string | null } | null
  accountedPlayback: { version: number; userId: string } | null
  failedPlaybackVersion: number | null
  queueRevision: number
  isAdvancing: boolean
  advanceHandler: ((entryId?: number) => Promise<void>) | null
  nextLocal: () => void
  playQueueEntry: (entryId: number) => void
  playReserved: (reservation: QueueReservation, ownerId: string) => void
  markAudioStarted: (userId: string | null) => void
  markAudioFailed: () => void
  invalidateQueue: () => void

  play: (song: Song, queue?: Song[]) => void
  /** Memulihkan lagu & posisi dari server, dalam keadaan pause. */
  restore: (song: Song, position: number) => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  attachAudio: (audioElement: HTMLAudioElement | null) => void
  stop: () => void
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  currentSong: null,
  queue: [],
  isPlaying: false,
  progress: 0,
  volume: 0.7,
  audioElement: null,
  playbackVersion: 0,
  contextIndex: -1,
  queueReservation: null,
  audioStarted: null,
  accountedPlayback: null,
  failedPlaybackVersion: null,
  queueRevision: 0,
  isAdvancing: false,
  advanceHandler: null,

  invalidateQueue: () => set((state) => ({ queueRevision: state.queueRevision + 1 })),
  markAudioStarted: (userId) => {
    const state = get()
    if (!state.currentSong || !state.isPlaying) return
    if (state.audioStarted?.version === state.playbackVersion && state.audioStarted.userId === userId) return
    set({ audioStarted: { version: state.playbackVersion, userId } })
  },
  markAudioFailed: () => set({ failedPlaybackVersion: get().playbackVersion, isPlaying: false }),
  playQueueEntry: (entryId) => { void get().advanceHandler?.(entryId) },
  playReserved: (reservation, ownerId) => set({
    currentSong: reservation.song, progress: 0, isPlaying: true,
    playbackVersion: get().playbackVersion + 1,
    queueReservation: { ...reservation, ownerId, status: 'pending' },
    audioStarted: null, failedPlaybackVersion: null,
  }),

  play: (song, queue) =>
    set({
      currentSong: song,
      // Kalau pemanggil tidak memberi antrean, lagu ini jadi antrean berisi
      // satu item — supaya next/previous tidak perlu menangani kasus kosong.
      queue: queue && queue.length > 0 ? queue : [song],
      isPlaying: true,
      progress: 0,
      playbackVersion: get().playbackVersion + 1,
      contextIndex: queue?.length ? Math.max(0, queue.findIndex((item) => item === song || item.id === song.id)) : 0,
      queueReservation: null, audioStarted: null, failedPlaybackVersion: null,
    }),

  /** Memulihkan lagu & posisi terakhir dari server, dalam keadaan pause. */
  restore: (song, position) =>
    set({
      currentSong: song,
      queue: [song],
      isPlaying: false,
      progress: Math.max(0, Math.min(position, song.duration)),
      playbackVersion: get().playbackVersion + 1,
      contextIndex: 0, queueReservation: null, audioStarted: null, failedPlaybackVersion: null,
    }),

  togglePlay: () => {
    if (!get().currentSong) return
    if (!get().isPlaying && get().queueReservation?.status === 'released') {
      get().playQueueEntry(get().queueReservation!.entry_id)
      return
    }
    const { audioElement, isPlaying } = get()
    if (isPlaying) {
      audioElement?.pause()
      set({ isPlaying: false })
      return
    }

    set({ isPlaying: true })
  },

  next: () => {
    const handler = get().advanceHandler
    if (handler) { void handler(); return }
    get().nextLocal()
  },

  nextLocal: () => {
    const { queue, currentSong } = get()
    if (!currentSong) return
    if (queue.length === 0) { get().stop(); return }

    const index = get().contextIndex
    // Berputar kembali ke awal saat sudah di lagu terakhir.
    const nextSong = queue[(index + 1) % queue.length]
    if (!nextSong) return

    set({ currentSong: nextSong, contextIndex: (index + 1) % queue.length, progress: 0, isPlaying: true, playbackVersion: get().playbackVersion + 1, queueReservation: null, audioStarted: null, failedPlaybackVersion: null })
  },

  previous: () => {
    const { queue, currentSong, progress } = get()
    if (!currentSong || queue.length === 0) return

    // Perilaku khas pemutar musik: kalau lagu sudah berjalan lebih dari 3 detik,
    // tombol previous mengulang lagu ini dari awal, bukan pindah ke lagu
    // sebelumnya. Tekan sekali lagi barulah pindah.
    if (progress > 3) {
      get().seek(0)
      return
    }

    const index = get().queueReservation ? get().contextIndex : (get().contextIndex - 1 + queue.length) % queue.length
    const previousSong = queue[index]
    if (!previousSong) return

    set({ currentSong: previousSong, contextIndex: index, progress: 0, isPlaying: true, playbackVersion: get().playbackVersion + 1, queueReservation: null, audioStarted: null, failedPlaybackVersion: null })
  },

  seek: (seconds) => {
    const { currentSong } = get()
    if (!currentSong) return
    const { audioElement } = get()
    const duration = audioElement && audioElement.readyState >= 1 && Number.isFinite(audioElement.duration)
      ? audioElement.duration : currentSong.duration
    const nextProgress = Math.min(Math.max(seconds, 0), duration)
    if (audioElement && audioElement.readyState >= 1) audioElement.currentTime = nextProgress
    set({ progress: nextProgress })
  },

  setVolume: (volume) => {
    const nextVolume = Math.min(Math.max(volume, 0), 1)
    const { audioElement } = get()
    if (audioElement) audioElement.volume = nextVolume
    set({ volume: nextVolume })
  },

  attachAudio: (audioElement) => {
    if (audioElement) audioElement.volume = get().volume
    set({ audioElement })
  },

  stop: () => {
    get().audioElement?.pause()
    set({ currentSong: null, queue: [], isPlaying: false, progress: 0, contextIndex: -1, queueReservation: null, audioStarted: null, failedPlaybackVersion: null })
  },
}))
