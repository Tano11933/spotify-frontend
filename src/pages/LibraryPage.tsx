import { useState } from 'react'

import { AlbumCard } from '@/components/AlbumCard'
import { ArtistCard } from '@/components/ArtistCard'
import { SectionGrid } from '@/components/SectionGrid'
import { SongRow } from '@/components/SongRow'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { libraryApi } from '@/lib/api'
import type { Album, Artist, Song } from '@/types'

type LibraryTab = 'tracks' | 'albums' | 'artists'

/**
 * Bentuk data per tab — discriminated union supaya TypeScript bisa
 * mempersempit tipenya saat merender (`data.tab === 'tracks'` → `data.songs`).
 */
type LibraryData =
  | { tab: 'tracks'; songs: Song[] }
  | { tab: 'albums'; albums: Album[] }
  | { tab: 'artists'; artists: Artist[] }

const TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: 'tracks', label: 'Lagu Disukai' },
  { id: 'albums', label: 'Album' },
  { id: 'artists', label: 'Artis' },
]

/**
 * Halaman library pribadi: lagu disukai, album tersimpan, artist diikuti.
 *
 * Satu `useAsync` dengan dependency [tab] — berganti tab memuat ulang datanya,
 * dan tiap tab punya bentuk data sendiri yang dibedakan lewat field `tab`
 * (discriminated union) supaya TypeScript bisa mempersempit tipenya.
 */
export function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>('tracks')

  const { data, error, isLoading, reload } = useAsync<LibraryData>(
    () => {
      if (tab === 'albums') {
        return libraryApi
          .getAlbums({ limit: 100 })
          .then((page) => ({ tab: 'albums' as const, albums: page.items }))
      }
      if (tab === 'artists') {
        return libraryApi
          .getFollowing({ limit: 100 })
          .then((page) => ({ tab: 'artists' as const, artists: page.items }))
      }
      return libraryApi
        .getTracks({ limit: 100 })
        .then((page) => ({ tab: 'tracks' as const, songs: page.items }))
    },
    [tab],
  )

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  return (
    <div className="pt-4">
      <h1 className="text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">Library</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-spotify-light-gray">
        Koleksi pribadimu: lagu yang disukai, album tersimpan, dan artist yang diikuti.
      </p>

      <div role="tablist" aria-label="Bagian library" className="mt-6 mb-8 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
              tab === item.id
                ? 'bg-spotify-green text-spotify-black-pure'
                : 'bg-spotify-elevated text-spotify-light-gray hover:text-spotify-white',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {data.tab === 'tracks' &&
        (data.songs.length === 0 ? (
          <EmptyState message="Belum ada lagu disukai. Tekan ikon hati pada lagu mana pun untuk menyimpannya." />
        ) : (
          <ul className="flex flex-col">
            {data.songs.map((song, index) => (
              <li key={song.id}>
                <SongRow song={song} index={index} queue={data.songs} />
              </li>
            ))}
          </ul>
        ))}

      {data.tab === 'albums' &&
        (data.albums.length === 0 ? (
          <EmptyState message="Belum ada album tersimpan. Buka sebuah album lalu tekan Simpan." />
        ) : (
          <SectionGrid title="Album tersimpan">
            {data.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </SectionGrid>
        ))}

      {data.tab === 'artists' &&
        (data.artists.length === 0 ? (
          <EmptyState message="Belum ada artist yang diikuti. Buka halaman artist lalu tekan Ikuti." />
        ) : (
          <SectionGrid title="Artis yang diikuti">
            {data.artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </SectionGrid>
        ))}
    </div>
  )
}
