import { useEffect, useRef } from 'react'

import { playerApi } from '@/lib/api'
import { env } from '@/lib/env'
import { useAuthStore } from '@/store/authStore'
import { usePlayerStore } from '@/store/playerStore'

/** Seberapa sering posisi dikirim ke server selama memutar. */
const SYNC_INTERVAL_MS = 30_000

/**
 * Menjembatani pemutar lokal dengan playback state di server: memulihkan lagu
 * & posisi terakhir, menyimpan posisi saat berhenti dan berkala, serta
 * mengirim posisi terakhir saat tab ditutup. Dipanggil sekali dari AppLayout.
 */
export function usePlayerSync() {
  const status = useAuthStore((state) => state.status)
  const userId = useAuthStore((state) => state.user?.id)
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)

  const previousUserId = useRef(userId)
  const wasPlaying = useRef(false)

  // Pulihkan sekali per sesi, dalam keadaan PAUSE: memulai pemutaran otomatis
  // akan mengejutkan user dan mencatat riwayat yang tidak diminta.
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return
    let active = true

    void playerApi
      .getState()
      .then((state) => {
        if (!active || !state.song) return
        // Jangan menimpa pemutaran yang sudah berjalan.
        if (usePlayerStore.getState().currentSong) return
        usePlayerStore.getState().restore(state.song, state.position_seconds)
      })
      .catch(() => {
        // State tidak bisa dimuat bukan kegagalan fatal; pemutar tetap lokal.
      })
    return () => { active = false }
  }, [status, userId])

  // Simpan posisi saat pemutaran berhenti, dan berkala selama memutar.
  useEffect(() => {
    if (status !== 'authenticated' || !currentSong || previousUserId.current !== userId) {
      wasPlaying.current = false
      return
    }

    const sync = () => {
      const { currentSong: song, progress } = usePlayerStore.getState()
      if (!song) return
      void playerApi
        .updateState({ song_id: song.id, position_seconds: Math.floor(progress) })
        .catch(() => {})
    }

    if (isPlaying) {
      wasPlaying.current = true
      const timer = setInterval(sync, SYNC_INTERVAL_MS)
      return () => clearInterval(timer)
    }

    // Baru berhenti memutar (bukan sekadar mount dalam keadaan pause).
    if (wasPlaying.current) {
      wasPlaying.current = false
      sync()
    }
  }, [status, userId, currentSong, isPlaying])

  // Keluar akun menghentikan pemutaran; state di server tetap tersimpan.
  useEffect(() => {
    if (status === 'unauthenticated' || previousUserId.current !== userId) {
      usePlayerStore.getState().stop()
    }
    previousUserId.current = userId
  }, [status, userId])

  // Saat tab ditutup, request axios bisa dibatalkan browser; fetch keepalive
  // dikirim sampai selesai walau halamannya sudah dibongkar.
  useEffect(() => {
    if (status !== 'authenticated') return

    const handler = () => {
      const { currentSong: song, progress } = usePlayerStore.getState()
      const token = useAuthStore.getState().accessToken
      if (!song || !token) return

      void fetch(`${env.VITE_API_BASE_URL}/api/me/player`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ song_id: song.id, position_seconds: Math.floor(progress) }),
        keepalive: true,
      }).catch(() => {})
    }

    window.addEventListener('pagehide', handler)
    return () => window.removeEventListener('pagehide', handler)
  }, [status, userId])
}
