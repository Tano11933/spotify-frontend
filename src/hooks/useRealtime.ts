import { useEffect } from 'react'

import { notificationApi } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useToastStore } from '@/store/toastStore'
import {
  WS_EVENT,
  type NotificationNewPayload,
  type SongCreatedPayload,
  type SongPlayingPayload,
} from '@/types/websocket'

/**
 * Menyambungkan WebSocket dan notifikasi ke state aplikasi.
 * Dipanggil SEKALI dari AppLayout.
 *
 * Tiga tanggung jawab, sengaja dipisah jadi tiga efek supaya masing-masing
 * punya dependency-nya sendiri dan tidak saling memicu jalan ulang.
 */
export function useRealtime() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const status = useAuthStore((state) => state.status)
  const pushToast = useToastStore((state) => state.push)
  const setUnread = useNotificationStore((state) => state.setUnread)
  const incrementUnread = useNotificationStore((state) => state.increment)

  /* --- 1. Sambung/putus mengikuti status login ---------------------------- */
  useEffect(() => {
    // Backend memvalidasi JWT SEBELUM upgrade koneksi (PRD.md §8) — tanpa token
    // valid, handshake ditolak 401. Jadi tidak ada gunanya mencoba menyambung
    // saat user belum login.
    if (status !== 'authenticated' || !accessToken) {
      wsClient.disconnect()
      return
    }

    wsClient.connect(accessToken)

    return () => wsClient.disconnect()
  }, [accessToken, status])

  /* --- 2. Terjemahkan event masuk jadi toast & badge ---------------------- */
  useEffect(() => {
    // subscribe() mengembalikan fungsi unsubscribe, dan itu langsung dipakai
    // sebagai cleanup efek ini.
    return wsClient.subscribe((event) => {
      switch (event.type) {
        case WS_EVENT.SONG_CREATED: {
          // Payload event ini adalah objek Song itu sendiri.
          const song = event.payload as SongCreatedPayload
          pushToast({
            title: 'Lagu baru ditambahkan',
            description: `${song.title} • ${song.artist?.name ?? 'Artis tidak diketahui'}`,
            variant: 'success',
          })
          break
        }

        case WS_EVENT.SONG_PLAYING: {
          // Sedangkan event ini payload-nya DIBUNGKUS: { song }. Perbedaan itu
          // berasal dari backend (lihat catatan di types/websocket.ts).
          const payload = event.payload as SongPlayingPayload | undefined
          if (!payload?.song) break

          pushToast({
            title: 'Sedang diputar user lain',
            description: `${payload.song.title} • ${payload.song.artist?.name ?? 'Artis tidak diketahui'}`,
            variant: 'info',
          })
          break
        }

        case WS_EVENT.NOTIFICATION_NEW: {
          // Dikirim TERTARGET ke user penerima (di sini: kita yang baru
          // diikuti), jadi badge bisa langsung naik tanpa refetch.
          const payload = event.payload as NotificationNewPayload | undefined
          if (!payload?.notification) break

          incrementUnread()
          pushToast({
            title: 'Pengikut baru',
            description: `${payload.notification.actor?.name ?? 'Seseorang'} mulai mengikuti kamu`,
            variant: 'info',
          })
          break
        }

        // connection:ack, pong, dan error tidak perlu ditampilkan ke user.
        default:
          break
      }
    })
  }, [pushToast, incrementUnread])

  /* --- 4. Muat jumlah notifikasi belum dibaca ----------------------------- */
  useEffect(() => {
    if (status !== 'authenticated') {
      // Logout harus mengosongkan badge; kalau tidak, angka milik user
      // sebelumnya ikut terbawa ke halaman login.
      setUnread(0)
      return
    }

    // limit 1: yang dibutuhkan hanya field `unread`, bukan isi daftarnya.
    void notificationApi
      .getMine({ limit: 1 })
      .then((page) => setUnread(page.unread))
      .catch(() => {
        // Badge bukan fitur kritis; biarkan 0 dan coba lagi saat event masuk.
      })
  }, [status, setUnread])
}
