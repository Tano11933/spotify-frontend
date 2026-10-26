import { useEffect } from 'react'

import { getApiErrorMessage, playerApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'

export function useQueuePlayback() {
  const userId = useAuthStore((state) => state.user?.id)
  const status = useAuthStore((state) => state.status)
  const reservation = usePlayerStore((state) => state.queueReservation)
  const audioStarted = usePlayerStore((state) => state.audioStarted)
  const failedVersion = usePlayerStore((state) => state.failedPlaybackVersion)
  const version = usePlayerStore((state) => state.playbackVersion)

  function sameAccount(ownerId: string) {
    const auth = useAuthStore.getState()
    return auth.status === 'authenticated' && auth.user?.id === ownerId
  }

  function release(id: string, ownerId: string) {
    if (sameAccount(ownerId)) void playerApi.releaseQueueEntry(id).catch(() => {})
  }

  useEffect(() => {
    let active = true
    let pending = false
    const advance = async (entryId?: number) => {
      if (pending) return
      const original = usePlayerStore.getState()
      if (status !== 'authenticated' || !userId) {
        if (!entryId) original.nextLocal()
        return
      }
      pending = true
      usePlayerStore.setState({ isAdvancing: true })
      try {
        if (original.queueReservation?.status === 'pending') {
          await playerApi.releaseQueueEntry(original.queueReservation.id)
        }
        const next = await playerApi.reserveQueueEntry(entryId)
        const current = usePlayerStore.getState()
        if (!active || !sameAccount(userId) || current.playbackVersion !== original.playbackVersion || current.isPlaying !== original.isPlaying) {
          if (next) release(next.id, userId)
          return
        }
        if (next) current.playReserved(next, userId)
        else if (!entryId) current.nextLocal()
      } catch (cause) {
        if (active && sameAccount(userId)) useToastStore.getState().push({ title: 'Antrean tidak bisa diputar', description: getApiErrorMessage(cause), variant: 'error' })
      } finally {
        pending = false
        if (active) usePlayerStore.setState({ isAdvancing: false })
      }
    }
    usePlayerStore.setState({ advanceHandler: advance })
    return () => {
      active = false
      if (usePlayerStore.getState().advanceHandler === advance) {
        usePlayerStore.setState({ advanceHandler: null, isAdvancing: false })
      }
    }
  }, [status, userId])

  useEffect(() => {
    if (!reservation || reservation.status !== 'pending') return
    const timer = window.setTimeout(() => {
      const current = usePlayerStore.getState()
      if (current.queueReservation?.id !== reservation.id || current.queueReservation.status !== 'pending') return
      current.audioElement?.pause()
      usePlayerStore.setState({ queueReservation: { ...reservation, status: 'released' }, isPlaying: false })
      release(reservation.id, reservation.ownerId)
      useToastStore.getState().push({ title: 'Waktu memuat antrean habis', description: 'Tekan Putar untuk mengambil entri ini lagi.', variant: 'error' })
    }, Math.max(0, Date.parse(reservation.expires_at) - Date.now() - 500))
    return () => {
      window.clearTimeout(timer)
      const current = usePlayerStore.getState().queueReservation
      if (current?.id !== reservation.id || current.status === 'pending') release(reservation.id, reservation.ownerId)
    }
  }, [reservation])

  useEffect(() => {
    if (!reservation || reservation.status !== 'pending' || failedVersion !== version) return
    usePlayerStore.setState({ queueReservation: { ...reservation, status: 'released' } })
    release(reservation.id, reservation.ownerId)
  }, [reservation, failedVersion, version])

  useEffect(() => {
    if (!audioStarted || !userId || status !== 'authenticated' || audioStarted.userId !== userId || audioStarted.version !== version) return
    const current = usePlayerStore.getState()
    if (!current.currentSong || !current.isPlaying || current.audioStarted !== audioStarted) return
    if (current.accountedPlayback?.userId === userId && current.accountedPlayback.version === version) return
    usePlayerStore.setState({ accountedPlayback: { userId, version } })
    const songId = current.currentSong.id
    const queued = current.queueReservation
    void (async () => {
      try {
        if (queued?.status === 'pending') {
          await playerApi.confirmQueueEntry(queued.id)
          const live = usePlayerStore.getState()
          if (live.queueReservation?.id === queued.id) usePlayerStore.setState({ queueReservation: { ...queued, status: 'confirmed' } })
          live.invalidateQueue()
        } else if (queued?.status === 'released') return
        if (sameAccount(userId)) await playerApi.play(songId)
      } catch (cause) {
        const live = usePlayerStore.getState()
        if (queued?.status === 'pending' && live.queueReservation?.id === queued.id && live.queueReservation.status === 'pending') {
          live.audioElement?.pause()
          usePlayerStore.setState({ queueReservation: { ...queued, status: 'released' }, isPlaying: false })
          release(queued.id, queued.ownerId)
        }
        if (sameAccount(userId)) useToastStore.getState().push({ title: 'Pemutaran belum tercatat', description: getApiErrorMessage(cause), variant: 'error' })
      }
    })()
  }, [audioStarted, userId, status, version])
}
