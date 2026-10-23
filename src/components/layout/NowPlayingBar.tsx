import { useRef } from 'react'
import { Link } from 'react-router'

import { useAudioPlayback } from '@/hooks/useAudioPlayback'
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
  const audioRef = useRef<HTMLAudioElement>(null)
  const { error, loading, duration, retry } = useAudioPlayback(audioRef)

  return (
    <footer aria-label="Pemutar musik" className="shrink-0 border-t border-spotify-border bg-spotify-black-pure">
      <audio ref={audioRef} preload="metadata" />
      <div role="status" aria-live="polite">
        {error ? (
          <div className="flex items-center gap-3 px-3 pt-2 text-sm text-spotify-white sm:px-4">
            <p className="min-w-0 flex-1">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="min-h-11 shrink-0 rounded-md px-3 font-semibold text-spotify-white underline underline-offset-4 hover:bg-spotify-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
            >
              Coba lagi
            </button>
          </div>
        ) : loading ? (
          <p className="px-3 pt-2 text-sm text-spotify-light-gray sm:px-4">Memuat audio…</p>
        ) : null}
      </div>
      <div className="flex h-20 items-center gap-2 px-2 sm:gap-4 sm:px-4">
      {/* Kolom kiri: info lagu */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {currentSong ? (
          <>
            <div className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-md bg-spotify-elevated sm:block">
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
      <div className="flex shrink-0 flex-col items-center sm:min-w-0 sm:flex-1">
        <div className="flex items-center gap-1 sm:gap-4">
          <button
            type="button"
            onClick={previous}
            disabled={!currentSong}
            aria-label="Lagu sebelumnya"
            className="flex h-11 w-11 items-center justify-center rounded-full text-spotify-light-gray transition-colors hover:text-spotify-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6 6h2v12H6V6Zm3 6 9-6v12l-9-6Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={error ? retry : togglePlay}
            disabled={!currentSong}
            aria-label={isPlaying ? 'Jeda' : 'Putar'}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-spotify-white text-spotify-black-pure transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white disabled:opacity-40 disabled:hover:scale-100"
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
            className="flex h-11 w-11 items-center justify-center rounded-full text-spotify-light-gray transition-colors hover:text-spotify-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white disabled:opacity-40"
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
            value={Math.min(progress, duration || 100)}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!currentSong}
            aria-label="Posisi pemutaran"
            className="h-8 min-w-0 flex-1 cursor-pointer accent-spotify-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white disabled:cursor-default"
          />

          <span className="text-xs tabular-nums text-spotify-light-gray">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Kolom kanan: antrean (selalu tampil) + volume (layar sedang ke atas). */}
      <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-1 md:gap-3">
        <Link
          to="/queue"
          aria-label="Antrean"
          title="Antrean"
          className="flex h-11 w-11 items-center justify-center rounded-full text-spotify-light-gray transition-colors hover:bg-white/10 hover:text-spotify-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white md:h-9 md:w-9"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M4 6h16v2H4V6Zm0 5h10v2H4v-2Zm0 5h7v2H4v-2Zm13-3v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z" />
          </svg>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
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
            className="h-11 w-24 cursor-pointer accent-spotify-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
          />
        </div>
      </div>
      </div>
    </footer>
  )
}
