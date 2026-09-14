import { useEffect, useRef } from 'react'

import { wsClient } from '@/lib/websocket'
import { useAuthStore } from '@/store/authStore'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'
import { WS_EVENT, type SongCreatedPayload, type SongPlayingPayload } from '@/types/websocket'

/**
 * Menyambungkan WebSocket ke state aplikasi. Dipanggil SEKALI dari AppLayout.
 *
 * Tiga tanggung jawab, sengaja dipisah jadi tiga efek supaya masing-masing
 * punya dependency-nya sendiri dan tidak saling memicu jalan ulang.
 */
export function useRealtime() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const status = useAuthStore((state) => state.status)
  const pushToast = useToastStore((state) => state.push)
  const currentSong = usePlayerStore((state) => state.currentSong)

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

  /* --- 2. Terjemahkan event masuk jadi toast ------------------------------ */
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
            description: `${song.title} — ${song.artist?.name ?? 'Artis tidak diketahui'}`,
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
            description: `${payload.song.title} — ${payload.song.artist?.name ?? 'Artis tidak diketahui'}`,
            variant: 'info',
          })
          break
        }

        // connection:ack, pong, dan error tidak perlu ditampilkan ke user.
        default:
          break
      }
    })
  }, [pushToast])

  /* --- 3. Siarkan lagu yang sedang kita putar ----------------------------- */
  const lastBroadcastSongId = useRef<number | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || !currentSong) return

    // Tanpa penjaga ini, setiap render yang kebetulan menjalankan efek lagi
    // akan mengirim ulang event untuk lagu yang sama, dan semua client lain
    // dibanjiri toast duplikat.
    if (lastBroadcastSongId.current === currentSong.id) return
    lastBroadcastSongId.current = currentSong.id

    // Yang dikirim hanya song_id — backend sengaja tidak mempercayai data lagu
    // dari client dan mengambil sendiri detailnya dari database sebelum
    // menyiarkan (lihat handleSongPlaying di ws_handler.go).
    wsClient.send({ type: WS_EVENT.SONG_PLAYING, payload: { song_id: currentSong.id } })
  }, [currentSong, status])
}
