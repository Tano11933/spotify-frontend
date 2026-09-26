import { useSearchParams } from 'react-router'

import { AlbumCard } from '@/components/AlbumCard'
import { ArtistCard } from '@/components/ArtistCard'
import { SectionGrid } from '@/components/SectionGrid'
import { SongRow } from '@/components/SongRow'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { searchApi } from '@/lib/api'

/** Backend menolak query < 2 karakter; dicek juga di sini supaya tidak ada request sia-sia. */
const MIN_QUERY_LENGTH = 2

/** Berapa hasil per grup yang ditampilkan — cukup untuk melihat sekilas. */
const RESULTS_PER_GROUP = 10

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').trim()
  const isQueryValid = query.length >= MIN_QUERY_LENGTH

  const { data, error, isLoading, reload } = useAsync(
    () => (isQueryValid ? searchApi.search({ q: query, limit: RESULTS_PER_GROUP }) : Promise.resolve(null)),
    // query primitif, jadi aman dipakai sebagai dependency: berpindah kata
    // kunci otomatis memicu pencarian ulang.
    [query],
  )

  if (!isQueryValid) {
    return (
      <div className="pt-4">
        <h1 className="text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">Cari</h1>
        <div className="mt-6">
          <EmptyState message="Ketik minimal 2 karakter di kotak pencarian atas untuk mencari lagu, artist, album, atau playlist." />
        </div>
      </div>
    )
  }

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const tracks = data.tracks?.items ?? []
  const artists = data.artists?.items ?? []
  const albums = data.albums?.items ?? []
  const playlists = data.playlists?.items ?? []
  const isEmpty = tracks.length + artists.length + albums.length + playlists.length === 0

  return (
    <div className="pt-4">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">
        Hasil untuk “{query}”
      </h1>

      {isEmpty ? (
        <EmptyState message="Tidak ada hasil. Coba kata kunci lain atau periksa ejaannya." />
      ) : (
        <>
          {tracks.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold text-spotify-white md:text-2xl">Lagu</h2>
              <ul className="flex flex-col">
                {tracks.map((song, index) => (
                  <li key={song.id}>
                    <SongRow song={song} index={index} queue={tracks} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {artists.length > 0 && (
            <SectionGrid title="Artis">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </SectionGrid>
          )}

          {albums.length > 0 && (
            <SectionGrid title="Album">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </SectionGrid>
          )}

          {playlists.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold text-spotify-white md:text-2xl">Playlist</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-4"
                  >
                    <p className="truncate text-sm font-bold text-spotify-white">{playlist.name}</p>
                    <p className="mt-1 truncate text-sm text-spotify-light-gray">
                      oleh {playlist.user?.name ?? 'pengguna'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
