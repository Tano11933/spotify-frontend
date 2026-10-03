import { Link, useParams } from 'react-router'

import { ArtistCard } from '@/components/ArtistCard'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { genresApi } from '@/lib/api'

/** Detail genre: daftar artist yang terdaftar di genre tersebut. */
export function GenreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const genreId = Number(id)

  const { data, error, isLoading, reload } = useAsync(
    () =>
      Promise.all([
        genresApi.getById(genreId),
        genresApi.getArtists(genreId, { limit: 100 }),
      ]).then(([genre, artists]) => ({ genre, artists: artists.items })),
    [genreId],
  )

  if (!Number.isInteger(genreId) || genreId <= 0) {
    return <ErrorState message="ID genre tidak valid." />
  }

  if (isLoading) return <LoadingState label="Memuat genre…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const { genre, artists } = data

  return (
    <div className="pt-4">
      <header className="mb-8">
        <p className="text-xs font-medium tracking-wide text-spotify-light-gray uppercase">Genre</p>
        <h1 className="mt-2 text-3xl font-bold break-words text-spotify-white md:text-5xl">
          {genre.name}
        </h1>
        <p className="mt-3 text-sm text-spotify-light-gray">{artists.length} artis</p>
      </header>

      {artists.length === 0 ? (
        <EmptyState message="Belum ada artis yang terdaftar di genre ini." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-6">
          {artists.map((artist) => (
            <li key={artist.id}>
              <ArtistCard artist={artist} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10">
        <Link
          to="/browse"
          className="text-sm font-semibold text-spotify-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
        >
          Kembali ke semua genre
        </Link>
      </p>
    </div>
  )
}
