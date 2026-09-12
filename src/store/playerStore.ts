import { create } from 'zustand'

import type { Song } from '@/types'

/**
 * State pemutar lagu.
 *
 * Ini pemutar MOCK — tidak ada audio yang benar-benar diputar (PRD.md §5.4:
 * "Player sederhana (mock, tidak perlu streaming audio sungguhan untuk MVP)").
 * Progress-nya digerakkan timer, bukan oleh elemen <audio>. Struktur state-nya
 * sengaja dibuat sama seperti pemutar sungguhan, jadi mengganti timer dengan
 * <audio> nanti tidak menuntut perubahan pada satu pun komponen.
 *
 * Terpisah dari authStore karena alasannya beda: yang ini berubah setiap detik.
 */
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

  play: (song: Song, queue?: Song[]) => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  /** Dipanggil timer tiap detik dari NowPlayingBar. */
  tick: () => void
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

  play: (song, queue) =>
    set({
      currentSong: song,
      // Kalau pemanggil tidak memberi antrean, lagu ini jadi antrean berisi
      // satu item — supaya next/previous tidak perlu menangani kasus kosong.
      queue: queue && queue.length > 0 ? queue : [song],
      isPlaying: true,
      progress: 0,
    }),

  togglePlay: () => {
    if (!get().currentSong) return
    const { audioElement, isPlaying } = get()
    if (isPlaying) {
      audioElement?.pause()
      set({ isPlaying: false })
      return
    }

    void audioElement?.play()
    set({ isPlaying: true })
  },

  next: () => {
    const { queue, currentSong } = get()
    if (!currentSong || queue.length === 0) return

    const index = queue.findIndex((song) => song.id === currentSong.id)
    // Berputar kembali ke awal saat sudah di lagu terakhir.
    const nextSong = queue[(index + 1) % queue.length]
    if (!nextSong) return

    set({ currentSong: nextSong, progress: 0, isPlaying: true })
  },

  previous: () => {
    const { queue, currentSong, progress } = get()
    if (!currentSong || queue.length === 0) return

    // Perilaku khas pemutar musik: kalau lagu sudah berjalan lebih dari 3 detik,
    // tombol previous mengulang lagu ini dari awal, bukan pindah ke lagu
    // sebelumnya. Tekan sekali lagi barulah pindah.
    if (progress > 3) {
      set({ progress: 0 })
      return
    }

    const index = queue.findIndex((song) => song.id === currentSong.id)
    const previousSong = queue[(index - 1 + queue.length) % queue.length]
    if (!previousSong) return

    set({ currentSong: previousSong, progress: 0, isPlaying: true })
  },

  seek: (seconds) => {
    const { currentSong } = get()
    if (!currentSong) return
    const nextProgress = Math.min(Math.max(seconds, 0), currentSong.duration)
    const { audioElement } = get()
    if (audioElement) audioElement.currentTime = nextProgress
    set({ progress: nextProgress })
  },

  tick: () => {
    const { currentSong, isPlaying, progress } = get()
    if (!currentSong || !isPlaying) return

    if (progress + 1 >= currentSong.duration) {
      get().next()
      return
    }

    set({ progress: progress + 1 })
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
    set({ currentSong: null, queue: [], isPlaying: false, progress: 0 })
  },
}))
