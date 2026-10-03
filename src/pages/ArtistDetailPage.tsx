import { Link, useParams } from 'react-router'

import { ArtistCard } from '@/components/ArtistCard'
import { DetailHero } from '@/components/DetailHero'
import { LibraryToggleButton } from '@/components/LibraryToggleButton'
import { SectionGrid } from '@/components/SectionGrid'
import { SongRow } from '@/components/SongRow'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { PlayButton } from '@/components/ui/PlayButton'
import { useAsync } from '@/hooks/useAsync'
import { catalogApi, discoveryApi } from '@/lib/api'
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
        // limit 100 (maksimum backend) supaya seluruh lagu artist tampil.
        catalogApi.getArtistSongs(artistId, { limit: 100 }),
        // "Fans also like": maksimal 5 kartu, cukup untuk satu baris grid.
        discoveryApi.getRelatedArtists(artistId, { limit: 5 }),
      ]).then(([artist, songs, related]) => ({
        artist,
        songs: songs.items,
        related: related.items,
      })),
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

  const { artist, songs, related } = data
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
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <PlayButton prominent onClick={() => play(firstSong, songs)} label={artist.name} />
              <LibraryToggleButton kind="artist" id={artist.id} />
            </div>
          )
        }
      />

      {artist.bio && (
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-spotify-light-gray">
          {artist.bio}
        </p>
      )}

      {artist.genres && artist.genres.length > 0 && (
        <ul className="mb-8 flex flex-wrap gap-2" aria-label="Genre artist">
          {artist.genres.map((genre) => (
            <li key={genre.id}>
              <Link
                to={`/genres/${genre.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-spotify-border px-4 text-sm font-medium text-spotify-light-gray transition-colors hover:border-spotify-white hover:text-spotify-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
              >
                {genre.name}
              </Link>
            </li>
          ))}
        </ul>
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

      {related.length > 0 && (
        <div className="mt-12">
          <SectionGrid title="Penggemar juga menyukai">
            {related.map((item) => (
              <ArtistCard key={item.id} artist={item} />
            ))}
          </SectionGrid>
        </div>
      )}
    </div>
  )
}
