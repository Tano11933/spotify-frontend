import { AlbumCard } from '@/components/AlbumCard'
import { ArtistCard } from '@/components/ArtistCard'
import { SectionGrid } from '@/components/SectionGrid'
import { SongCard } from '@/components/SongCard'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { catalogApi, discoveryApi } from '@/lib/api'
import { greetingForHour } from '@/lib/format'
import { useAuthStore } from '@/store/authStore'

/** Berapa item yang ditampilkan per section sebelum "Lihat semua". */
const PREVIEW_LIMIT = 5
const RECOMMENDATION_LIMIT = 6

export function HomePage() {
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)

  /**
   * Promise.all menembakkan keempat request BERSAMAAN, bukan berurutan.
   *
   * limit diisi sesuai kebutuhan section: artist & album hanya untuk preview
   * (5 kartu), lagu satu halaman penuh, dan chart cukup 5 untuk teaser. `total`
   * dari envelope dipakai untuk memutuskan apakah "Lihat semua" perlu tampil.
   *
   * Ini juga skenario yang menguji single-flight di interceptor: keempatnya
   * bisa balik 401 hampir bersamaan saat access token kedaluwarsa, dan hanya
   * boleh ada SATU panggilan refresh (lihat lib/api.ts).
   */
  const { data, error, isLoading, reload } = useAsync(
    () =>
      Promise.all([
        catalogApi.getArtists({ limit: PREVIEW_LIMIT }),
        catalogApi.getAlbums({ limit: PREVIEW_LIMIT }),
        catalogApi.getSongs({ limit: 20 }),
        discoveryApi.getTopTracks({ limit: PREVIEW_LIMIT }),
      ]).then(([artists, albums, songs, topTracks]) => ({ artists, albums, songs, topTracks })),
    [],
  )

  /**
   * Rekomendasi personal butuh login, dan request-nya baru boleh berangkat
   * setelah bootstrap sesi selesai; status 'idle'/'bootstrapping' berarti
   * token belum siap, jadi hasilnya sengaja null.
   */
  const personalized = useAsync(
    () =>
      status === 'authenticated'
        ? discoveryApi.getRecommendations({ limit: RECOMMENDATION_LIMIT })
        : Promise.resolve(null),
    [status],
  )

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const { artists, albums, songs, topTracks } = data
  const recommendations = personalized.data
  const isCatalogEmpty = artists.total === 0 && albums.total === 0 && songs.total === 0

  return (
    <div className="pt-4">
      <h1 className="mb-8 text-3xl font-bold text-spotify-white md:text-5xl">
        {greetingForHour()}
        {user ? `, ${user.name.split(' ')[0]}` : ''}
      </h1>

      {status === 'authenticated' && personalized.isLoading && (
        <p className="mb-10 text-sm text-spotify-light-gray">Memuat rekomendasi…</p>
      )}

      {status === 'authenticated' && personalized.error && (
        <div className="mb-10 flex flex-wrap items-center gap-3 rounded-lg border border-white/[0.06] bg-spotify-dark-gray px-4 py-3">
          <p className="text-sm text-spotify-light-gray">Rekomendasi gagal dimuat.</p>
          <button
            type="button"
            onClick={personalized.reload}
            className="text-sm font-semibold text-spotify-white underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
          >
            Coba lagi
          </button>
        </div>
      )}

      {recommendations && recommendations.items.length > 0 && (
        <SectionGrid title="Dibuat untukmu">
          {recommendations.items.map((song) => (
            // queue diisi seluruh daftar rekomendasi, jadi tombol next/previous
            // menyusuri section ini.
            <SongCard key={song.id} song={song} queue={recommendations.items} />
          ))}
        </SectionGrid>
      )}

      {isCatalogEmpty ? (
        <EmptyState message="Katalog masih kosong. Tambahkan artist, album, atau lagu lewat endpoint admin di backend." />
      ) : (
        <>
          {topTracks.items.length > 0 && (
            <SectionGrid
              title="Tangga lagu 7 hari"
              seeAllTo={topTracks.total > topTracks.items.length ? '/charts' : undefined}
            >
              {topTracks.items.map((song) => (
                <SongCard key={song.id} song={song} queue={topTracks.items} />
              ))}
            </SectionGrid>
          )}

          {artists.items.length > 0 && (
            <SectionGrid
              title="Artis populer"
              seeAllTo={artists.total > artists.items.length ? '/artists' : undefined}
            >
              {artists.items.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </SectionGrid>
          )}

          {albums.items.length > 0 && (
            <SectionGrid
              title="Album terbaru"
              seeAllTo={albums.total > albums.items.length ? '/albums' : undefined}
            >
              {albums.items.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </SectionGrid>
          )}

          {songs.items.length > 0 && (
            <SectionGrid title="Semua lagu">
              {songs.items.map((song) => (
                // queue diisi seluruh daftar lagu, jadi tombol next/previous di
                // now-playing bar bergerak menyusuri grid ini.
                <SongCard key={song.id} song={song} queue={songs.items} />
              ))}
            </SectionGrid>
          )}
        </>
      )}
    </div>
  )
}
