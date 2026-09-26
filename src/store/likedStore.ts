import { create } from 'zustand'

import { getApiErrorMessage, libraryApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

/**
 * Status "lagu disukai" untuk ikon hati.
 *
 * Dua alasan status ini tidak tinggal di dalam komponen tombol:
 *
 *  1. Batching — satu halaman bisa menampilkan puluhan lagu. Kalau tiap tombol
 *     memanggil `contains` sendiri-sendiri, satu halaman menghasilkan puluhan
 *     request. Store mengumpulkan id yang belum diketahui, menunggu sesaat,
 *     lalu mengirimnya dalam SATU panggilan (backend menerima sampai 100 id).
 *  2. Konsistensi — menyukai lagu di satu halaman langsung tercermin pada
 *     tombol lain yang menampilkan lagu yang sama.
 *
 * `toggle` bersifat optimistic: ikon berubah lebih dulu, dan dikembalikan lagi
 * kalau request gagal — supaya UI terasa instan tanpa berbohong selamanya.
 */
interface LikedState {
  /** id lagu → disukai? `false` juga status yang diketahui, beda dari "belum tahu". */
  liked: Record<number, boolean>
  ensureLoaded: (songIds: number[]) => void
  toggle: (songId: number) => Promise<void>
}

const FLUSH_DELAY_MS = 50

let pendingIDs = new Set<number>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

export const useLikedStore = create<LikedState>()((set, get) => ({
  liked: {},

  ensureLoaded: (songIds) => {
    const { liked } = get()
    const unknown = songIds.filter((id) => !(id in liked))
    if (unknown.length === 0) return

    for (const id of unknown) pendingIDs.add(id)

    if (flushTimer !== null) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      void flushPending()
    }, FLUSH_DELAY_MS)
  },

  toggle: async (songId) => {
    if (useAuthStore.getState().status !== 'authenticated') return

    const wasLiked = get().liked[songId] ?? false
    set((state) => ({ liked: { ...state.liked, [songId]: !wasLiked } }))

    try {
      if (wasLiked) {
        await libraryApi.removeTrack(songId)
      } else {
        await libraryApi.saveTrack(songId)
      }
    } catch (error) {
      set((state) => ({ liked: { ...state.liked, [songId]: wasLiked } }))
      useToastStore.getState().push({
        title: 'Gagal memperbarui Lagu Disukai',
        description: getApiErrorMessage(error),
        variant: 'error',
      })
    }
  },
}))

async function flushPending(): Promise<void> {
  const ids = [...pendingIDs]
  pendingIDs = new Set()
  if (ids.length === 0) return

  try {
    const result = await libraryApi.tracksContain(ids)

    const known: Record<number, boolean> = {}
    for (const [key, value] of Object.entries(result)) {
      known[Number(key)] = value
    }

    useLikedStore.setState((state) => ({ liked: { ...state.liked, ...known } }))
  } catch {
    // Ikon hati bukan fitur kritis: kalau `contains` gagal (mis. offline),
    // tombolnya cukup tidak menampilkan status apa pun.
  }
}
