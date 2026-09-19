import { Card, CardCover } from '@/components/ui/Card'
import { PlayButton } from '@/components/ui/PlayButton'
import { formatDuration } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'
import type { Song } from '@/types'

interface SongCardProps {
  song: Song
  /** Antrean untuk tombol next/previous — biasanya seluruh daftar di grid ini. */
  queue?: Song[]
}

export function SongCard({ song, queue }: SongCardProps) {
  const play = usePlayerStore((state) => state.play)
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)

  const isCurrent = currentSong?.id === song.id

  return (
    <Card>
      <CardCover
        imageUrl={song.album?.cover_url ?? song.artist?.image_url}
        alt={song.title}
        action={
          <PlayButton
            onClick={() => play(song, queue)}
            label={song.title}
            isPlaying={isCurrent && isPlaying}
          />
        }
      />

      {/*
        Judul lagu yang sedang diputar diberi warna hijau — DESIGN.md §1
        menyebut hijau sebagai indikator "sedang diputar", dan ini salah satu
        dari sedikit tempat yang boleh memakainya.
      */}
      <h3
        className={
          isCurrent
            ? 'truncate text-base font-semibold text-spotify-green'
            : 'truncate text-base font-semibold text-spotify-white'
        }
      >
        {song.title}
      </h3>
      <p className="mt-1 truncate text-sm text-spotify-light-gray">
        {song.artist?.name ?? 'Artis tidak diketahui'} • {formatDuration(song.duration)}
      </p>
    </Card>
  )
}
