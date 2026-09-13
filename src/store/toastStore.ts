import { create } from 'zustand'

/**
 * State notifikasi toast — murni UI, sengaja terpisah dari authStore.
 *
 * Dipakai terutama oleh event WebSocket (ARCHITECTURE.md §4.3 langkah 5), tapi
 * juga berguna untuk umpan balik aksi biasa.
 */
export type ToastVariant = 'info' | 'success' | 'error'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

/** DESIGN.md §7: toast hilang sendiri setelah 4 detik. */
const AUTO_DISMISS_MS = 4000

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
  clear: () => void
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  push: (toast) => {
    // crypto.randomUUID tersedia di semua browser modern lewat konteks aman
    // (https, atau localhost saat development).
    const id = crypto.randomUUID()

    set((state) => ({
      // Batasi jumlah toast yang tampak bersamaan. Tanpa ini, satu ledakan event
      // WebSocket bisa memenuhi layar dan menutupi kontrol pemutar.
      toasts: [...state.toasts, { ...toast, id }].slice(-3),
    }))

    // Timer hidup di store, bukan di komponen. Kalau ditaruh di komponen,
    // toast yang ter-unmount lebih dulu (mis. karena pindah halaman)
    // meninggalkan timer yang menunjuk komponen yang sudah tidak ada.
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS)

    return id
  },

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  clear: () => set({ toasts: [] }),
}))
