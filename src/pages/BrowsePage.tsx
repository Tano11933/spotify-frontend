import { Link } from 'react-router'

import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { genresApi } from '@/lib/api'

/**
 * Halaman Jelajahi: daftar genre sebagai pintu masuk katalog.
 *
 * Kartunya sengaja teks saja, tanpa gambar atau warna acak per genre: backend
 * tidak menyimpan gambar genre, dan warna karangan per kartu hanya menambah
 * dekorasi yang tidak berarti apa-apa.
 */
export function BrowsePage() {
  const { data, error, isLoading, reload } = useAsync(() => genresApi.getAll({ limit: 100 }), [])

  if (isLoading) return <LoadingState label="Memuat genre…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  return (
    <div className="pt-4">
      <h1 className="text-3xl font-bold text-spotify-white md:text-5xl">Jelajahi</h1>
      <p className="mt-2 mb-8 text-sm text-spotify-light-gray">Telusuri katalog lewat genre.</p>

      {data.items.length === 0 ? (
        <EmptyState message="Belum ada genre di katalog. Admin bisa menambahkannya lewat API /api/genres." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-6">
          {data.items.map((genre) => (
            <li key={genre.id}>
              <Link
                to={`/genres/${genre.id}`}
                className="flex min-h-28 items-end rounded-md bg-spotify-dark-gray p-4 transition-colors hover:bg-spotify-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
              >
                <span className="text-lg font-bold break-words text-spotify-white">
                  {genre.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
