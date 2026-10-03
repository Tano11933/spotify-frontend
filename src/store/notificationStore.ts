import { create } from 'zustand'

import { notificationApi } from '@/lib/api'

/**
 * Jumlah notifikasi belum dibaca untuk badge lonceng.
 *
 * Angka ini hidup di store, bukan di dalam komponen lonceng, karena ada dua
 * sumber yang memperbaruinya: fetch awal saat sesi pulih, dan event WebSocket
 * `notification:new` yang bisa datang kapan saja.
 */
interface NotificationState {
  unread: number
  setUnread: (count: number) => void
  increment: () => void
  markAllRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  unread: 0,

  // Math.max(0, ...) menjaga badge tetap waras kalau ada balapan antara
  // event WebSocket dan fetch yang membawa angka lebih lama.
  setUnread: (count) => set({ unread: Math.max(0, count) }),

  increment: () => set((state) => ({ unread: state.unread + 1 })),

  markAllRead: async () => {
    if (get().unread === 0) return
    await notificationApi.markAllRead()
    set({ unread: 0 })
  },
}))
