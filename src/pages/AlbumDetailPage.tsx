import { Link, useParams } from 'react-router'

import { DetailHero } from '@/components/DetailHero'
import { LibraryToggleButton } from '@/components/LibraryToggleButton'
import { SongRow } from '@/components/SongRow'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { PlayButton } from '@/components/ui/PlayButton'
import { useAsync } from '@/hooks/useAsync'
import { catalogApi } from '@/lib/api'
import { formatYear } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const albumId = Number(id)

  const play = usePlayerStore((state) => state.play)

  // Cukup satu request: GET /api/albums/:id di backend sudah mem-Preload
  // "Artist" DAN "Songs" (album_repository.go), jadi tidak perlu request
  // terpisah untuk daftar lagunya.
  const { data: album, error, isLoading, reload } = useAsync(
    () => catalogApi.getAlbum(albumId),
    [albumId],
  )

  if (!Number.isInteger(albumId) || albumId <= 0) {
    return <ErrorState message="ID album tidak valid." />
  }

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!album) return null

  const songs = album.songs ?? []
  const firstSong = songs[0]

  return (
    <div>
      <DetailHero
        kind="Album"
        title={album.title}
        imageUrl={album.cover_url}
        meta={
          <span className="flex flex-wrap items-center justify-center gap-1 sm:justify-start">
            {album.artist && (
              <>
                <Link
                  to={`/artists/${album.artist.id}`}
                  className="font-semibold text-spotify-white hover:underline"
                >
                  {album.artist.name}
                </Link>
                <span aria-hidden="true">•</span>
              </>
            )}
            <span>{formatYear(album.release_date)}</span>
            <span aria-hidden="true">•</span>
            <span>{songs.length} lagu</span>
          </span>
        }
        action={
          firstSong && (
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <PlayButton prominent onClick={() => play(firstSong, songs)} label={album.title} />
              <LibraryToggleButton kind="album" id={album.id} />
            </div>
          )
        }
      />

      {songs.length === 0 ? (
        <EmptyState message="Album ini belum punya lagu." />
      ) : (
        <ul className="flex flex-col">
          {songs.map((song, index) => (
            <li key={song.id}>
              <SongRow song={song} index={index} queue={songs} showArtist={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
