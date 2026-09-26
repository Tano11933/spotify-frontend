import { AlbumCard } from '@/components/AlbumCard'
import { ArtistCard } from '@/components/ArtistCard'
import { SectionGrid } from '@/components/SectionGrid'
import { SongCard } from '@/components/SongCard'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { catalogApi } from '@/lib/api'
import { greetingForHour } from '@/lib/format'
import { useAuthStore } from '@/store/authStore'

/** Berapa item yang ditampilkan per section sebelum "Lihat semua". */
const PREVIEW_LIMIT = 5

export function HomePage() {
  const user = useAuthStore((state) => state.user)

  /**
   * Promise.all menembakkan ketiga request BERSAMAAN, bukan berurutan.
   *
   * limit diisi sesuai kebutuhan section: artist & album hanya untuk preview
   * (5 kartu), lagu satu halaman penuh. `total` dari envelope dipakai untuk
   * memutuskan apakah tautan "Lihat semua" perlu tampil.
   *
   * Ini juga skenario yang menguji single-flight di interceptor: ketiganya bisa
   * balik 401 hampir bersamaan saat access token kedaluwarsa, dan hanya boleh
   * ada SATU panggilan refresh (lihat lib/api.ts).
   */
  const { data, error, isLoading, reload } = useAsync(
    () =>
      Promise.all([
        catalogApi.getArtists({ limit: PREVIEW_LIMIT }),
        catalogApi.getAlbums({ limit: PREVIEW_LIMIT }),
        catalogApi.getSongs({ limit: 20 }),
      ]).then(([artists, albums, songs]) => ({ artists, albums, songs })),
    [],
  )

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const { artists, albums, songs } = data
  const isCatalogEmpty = artists.total === 0 && albums.total === 0 && songs.total === 0

  return (
    <div className="pt-4">
      <h1 className="mb-8 text-3xl font-bold text-spotify-white md:text-5xl">
        {greetingForHour()}
        {user ? `, ${user.name.split(' ')[0]}` : ''}
      </h1>

      {isCatalogEmpty ? (
        <EmptyState message="Katalog masih kosong. Tambahkan artist, album, atau lagu lewat endpoint admin di backend." />
      ) : (
        <>
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
