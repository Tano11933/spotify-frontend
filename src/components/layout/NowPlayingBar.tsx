import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'

/**
 * Bar pemutar di bawah — DESIGN.md §3 (h-20, 3 kolom) & §7 (progress halus).
 *
 * Audio diputar melalui elemen <audio> tersembunyi; state player tetap menjadi
 * sumber kontrol queue dan tampilan progress.
 */
export function NowPlayingBar() {
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const progress = usePlayerStore((state) => state.progress)
  const volume = usePlayerStore((state) => state.volume)
  const togglePlay = usePlayerStore((state) => state.togglePlay)
  const next = usePlayerStore((state) => state.next)
  const previous = usePlayerStore((state) => state.previous)
  const seek = usePlayerStore((state) => state.seek)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const attachAudio = usePlayerStore((state) => state.attachAudio)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioUnavailable, setAudioUnavailable] = useState(false)

  useEffect(() => {
    attachAudio(audioRef.current)
    return () => attachAudio(null)
  }, [attachAudio, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) return

    setAudioUnavailable(false)
    audio.src = currentSong.file_url
    audio.currentTime = 0
    audio.load()
  }, [currentSong])

  useEffect(() => {
    if (!isPlaying || !currentSong || !audioUnavailable) return

    const intervalId = setInterval(() => {
      usePlayerStore.getState().tick()
    }, 1000)

    return () => clearInterval(intervalId)
  }, [audioUnavailable, currentSong, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) return

    const updateProgress = () => usePlayerStore.setState({ progress: audio.currentTime })
    const playNext = () => usePlayerStore.getState().next()
    const playbackFailed = () => {
      setAudioUnavailable(true)
      // URL demo dari seeder memang tidak menunjuk ke file sungguhan.
      // Tetap pertahankan simulasi pemutaran agar UI tidak ikut mati.
      usePlayerStore.setState({ isPlaying: true })
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('ended', playNext)
    audio.addEventListener('error', playbackFailed)
    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('ended', playNext)
      audio.removeEventListener('error', playbackFailed)
    }
  }, [currentSong])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying && currentSong && audio.src === currentSong.file_url) {
      void audio.play().catch(() => {
        setAudioUnavailable(true)
        usePlayerStore.setState({ isPlaying: true })
      })
    } else if (!isPlaying) {
      audio.pause()
    }
  }, [isPlaying, currentSong])

  const duration = currentSong?.duration ?? 0
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <footer className="flex h-20 shrink-0 items-center gap-4 border-t border-spotify-border bg-spotify-black-pure px-4">
      <audio ref={audioRef} preload="metadata" />
      {/* Kolom kiri: info lagu */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {currentSong ? (
          <>
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-spotify-elevated">
              {currentSong.album?.cover_url || currentSong.artist?.image_url ? (
                <img
                  src={currentSong.album?.cover_url || currentSong.artist?.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-spotify-white">
                {currentSong.title}
              </p>
              <p className="truncate text-xs text-spotify-light-gray">
                {currentSong.artist?.name ?? 'Artis tidak diketahui'}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-spotify-light-gray">Belum ada lagu diputar</p>
        )}
      </div>

      {/* Kolom tengah: kontrol + progress */}
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={previous}
            disabled={!currentSong}
            aria-label="Lagu sebelumnya"
            className="text-spotify-light-gray transition-colors hover:text-spotify-white disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6 6h2v12H6V6Zm3 6 9-6v12l-9-6Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!currentSong}
            aria-label={isPlaying ? 'Jeda' : 'Putar'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-spotify-white text-spotify-black-pure transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M8 5h3v14H8V5Zm5 0h3v14h-3V5Z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 translate-x-[1px]"
                aria-hidden="true"
              >
                <path d="M8 5.14v13.72a.5.5 0 0 0 .77.42l10.29-6.86a.5.5 0 0 0 0-.84L8.77 4.72a.5.5 0 0 0-.77.42Z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={next}
            disabled={!currentSong}
            aria-label="Lagu berikutnya"
            className="text-spotify-light-gray transition-colors hover:text-spotify-white disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M16 6h2v12h-2V6Zm-1 6L6 18V6l9 6Z" />
            </svg>
          </button>
        </div>

        {/* Progress bar — disembunyikan di mobile sesuai DESIGN.md §6 (compact) */}
        <div className="hidden w-full max-w-md items-center gap-2 sm:flex">
          <span className="text-xs tabular-nums text-spotify-light-gray">
            {formatDuration(progress)}
          </span>

          {/*
            <input type="range"> dipakai, bukan <div> yang dihias.
            Alasannya aksesibilitas: range bawaan sudah bisa digeser dengan
            tombol panah, punya peran slider bagi screen reader, dan
            mengumumkan nilainya. Menirukan semua itu di atas div butuh
            belasan baris ARIA yang mudah salah.
          */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!currentSong}
            aria-label="Posisi pemutaran"
            className={cn(
              'h-1 flex-1 cursor-pointer appearance-none rounded-full',
              'disabled:cursor-default',
            )}
            // Isi bar dibuat dari gradient dua warna yang titik potongnya
            // mengikuti progress. Ini satu-satunya nilai dinamis di file ini
            // yang tidak bisa diungkapkan dengan utility class Tailwind,
            // karena angkanya berubah tiap detik.
            style={{
              background: `linear-gradient(to right, var(--color-spotify-green) ${progressPercent}%, var(--color-spotify-border) ${progressPercent}%)`,
            }}
          />

          <span className="text-xs tabular-nums text-spotify-light-gray">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Kolom kanan: volume — disembunyikan di layar kecil (DESIGN.md §6) */}
      <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5 text-spotify-light-gray"
          aria-hidden="true"
        >
          <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12Z" />
        </svg>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(event) => setVolume(Number(event.target.value) / 100)}
          aria-label="Volume"
          className="h-1 w-24 cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(to right, var(--color-spotify-white) ${volume * 100}%, var(--color-spotify-border) ${volume * 100}%)`,
          }}
        />
      </div>
    </footer>
  )
}
