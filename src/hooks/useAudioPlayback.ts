import { useEffect, useState, type RefObject } from 'react'

import { streamUrl } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'

export function useAudioPlayback(audioRef: RefObject<HTMLAudioElement | null>) {
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playbackVersion = usePlayerStore((state) => state.playbackVersion)
  const attachAudio = usePlayerStore((state) => state.attachAudio)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    attachAudio(audioRef.current)
    return () => attachAudio(null)
  }, [audioRef, attachAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    setError(null)
    setLoading(Boolean(currentSong))
    setDuration(currentSong?.duration ?? 0)
    if (!currentSong) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      return
    }

    let metadataLoaded = false
    const metadata = () => {
      metadataLoaded = true
      const limit = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration : currentSong.duration
      const position = Math.max(0, Math.min(usePlayerStore.getState().progress, limit))
      audio.currentTime = position
      setDuration(limit)
      usePlayerStore.setState({ progress: position })
    }
    const updateProgress = () => {
      if (metadataLoaded) usePlayerStore.setState({ progress: audio.currentTime })
    }
    const playNext = () => usePlayerStore.getState().next()
    const ready = () => setLoading(false)
    const waiting = () => setLoading(true)
    const playing = () => {
      if (!usePlayerStore.getState().isPlaying) {
        audio.pause()
        return
      }
      setError(null)
      setLoading(false)
    }
    const failed = () => {
      setError('Audio tidak bisa dimuat. Periksa koneksi lalu coba lagi.')
      setLoading(false)
      usePlayerStore.setState({ isPlaying: false })
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', metadata)
    audio.addEventListener('ended', playNext)
    audio.addEventListener('canplay', ready)
    audio.addEventListener('waiting', waiting)
    audio.addEventListener('playing', playing)
    audio.addEventListener('error', failed)
    audio.src = streamUrl(currentSong.id)
    audio.load()

    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('loadedmetadata', metadata)
      audio.removeEventListener('ended', playNext)
      audio.removeEventListener('canplay', ready)
      audio.removeEventListener('waiting', waiting)
      audio.removeEventListener('playing', playing)
      audio.removeEventListener('error', failed)
      audio.pause()
    }
  }, [audioRef, currentSong, playbackVersion])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) return
    if (!isPlaying) {
      audio.pause()
      return
    }

    // A previous play promise can settle after the user pauses or changes songs.
    let active = true
    setError(null)
    setLoading(true)
    void audio.play().then(() => {
      if (active) setLoading(false)
    }).catch((cause: unknown) => {
      if (!active) return
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? 'Browser menahan pemutaran. Tekan Putar untuk mencoba lagi.'
        : 'Audio tidak bisa diputar. Periksa koneksi atau pilih lagu lain.')
      setLoading(false)
      usePlayerStore.setState({ isPlaying: false })
    })
    return () => { active = false }
  }, [audioRef, currentSong, isPlaying, playbackVersion])

  const retry = () => {
    const state = usePlayerStore.getState()
    if (state.currentSong) {
      usePlayerStore.setState({ isPlaying: true, playbackVersion: state.playbackVersion + 1 })
    }
  }

  return { error, loading, duration, retry }
}
