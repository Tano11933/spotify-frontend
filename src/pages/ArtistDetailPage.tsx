import { useParams } from 'react-router'

import { DetailHero } from '@/components/DetailHero'
import { SongRow } from '@/components/SongRow'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { PlayButton } from '@/components/ui/PlayButton'
import { useAsync } from '@/hooks/useAsync'
import { catalogApi } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'

export function ArtistDetailPage() {
  // useParams membaca segmen dinamis dari path (":id" di definisi route).
  // Nilainya SELALU string | undefined — router tidak tahu apa-apa soal tipe
  // yang kita harapkan, jadi konversi dan pengecekannya tanggung jawab kita.
  const { id } = useParams<{ id: string }>()
  const artistId = Number(id)

  const play = usePlayerStore((state) => state.play)

  const { data, error, isLoading, reload } = useAsync(
    () =>
      Promise.all([
        catalogApi.getArtist(artistId),
        catalogApi.getArtistSongs(artistId),
      ]).then(([artist, songs]) => ({ artist, songs })),
    // artistId masuk deps: berpindah dari /artists/1 ke /artists/2 memakai
    // komponen yang SAMA (React Router tidak mem-unmount-nya), jadi tanpa ini
    // halaman akan tetap menampilkan artist yang lama.
    [artistId],
  )

  if (!Number.isInteger(artistId) || artistId <= 0) {
    return <ErrorState message="ID artist tidak valid." />
  }

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const { artist, songs } = data
  const firstSong = songs[0]

  return (
    <div>
      <DetailHero
        kind="Artis"
        title={artist.name}
        imageUrl={artist.image_url}
        rounded="full"
        meta={`${songs.length} lagu`}
        action={
          firstSong && (
            <PlayButton prominent onClick={() => play(firstSong, songs)} label={artist.name} />
          )
        }
      />

      {artist.bio && (
        <p className="mb-8 max-w-3xl text-sm leading-relaxed text-spotify-light-gray">
          {artist.bio}
        </p>
      )}

      <h2 className="mb-4 text-xl font-bold text-spotify-white md:text-2xl">Lagu</h2>

      {songs.length === 0 ? (
        <EmptyState message="Artist ini belum punya lagu." />
      ) : (
        <ul className="flex flex-col">
          {songs.map((song, index) => (
            <li key={song.id}>
              {/* showArtist=false: semua lagu di sini milik artist yang sama,
                  jadi mengulang namanya tiap baris hanya jadi kebisingan. */}
              <SongRow song={song} index={index} queue={songs} showArtist={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
