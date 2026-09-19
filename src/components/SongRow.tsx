import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'
import type { Song } from '@/types'

interface SongRowProps {
  song: Song
  index: number
  queue: Song[]
  /** Sembunyikan kolom artist saat semua lagu di daftar ini milik artist yang sama. */
  showArtist?: boolean
}

/**
 * Baris lagu untuk halaman detail (album/artist) — bentuk daftar, bukan grid.
 */
export function SongRow({ song, index, queue, showArtist = true }: SongRowProps) {
  const play = usePlayerStore((state) => state.play)
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)

  const isCurrent = currentSong?.id === song.id

  return (
    <button
      type="button"
      onClick={() => play(song, queue)}
      className={cn(
        'group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-4 rounded-md px-4 py-2 text-left',
        'transition-colors hover:bg-spotify-elevated',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
      )}
    >
      <span
        className={cn(
          'text-sm tabular-nums',
          isCurrent ? 'text-spotify-green' : 'text-spotify-light-gray',
        )}
      >
        {/* Ikon speaker kecil menggantikan nomor untuk lagu yang sedang berbunyi. */}
        {isCurrent && isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12Z" />
          </svg>
        ) : (
          index + 1
        )}
      </span>

      <span className="min-w-0">
        <span
          className={cn(
            'block truncate text-base font-semibold',
            isCurrent ? 'text-spotify-green' : 'text-spotify-white',
          )}
        >
          {song.title}
        </span>
        {showArtist && (
          <span className="block truncate text-sm text-spotify-light-gray">
            {song.artist?.name ?? 'Artis tidak diketahui'}
          </span>
        )}
      </span>

      {/* tabular-nums membuat lebar tiap digit sama, jadi kolom durasi tidak
          bergeser-geser antar baris. */}
      <span className="text-sm tabular-nums text-spotify-light-gray">
        {formatDuration(song.duration)}
      </span>
    </button>
  )
}
