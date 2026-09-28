import { useState } from 'react'

import { AlbumCard } from '@/components/AlbumCard'
import { ArtistCard } from '@/components/ArtistCard'
import { SectionGrid } from '@/components/SectionGrid'
import { SongRow } from '@/components/SongRow'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { libraryApi, playerApi } from '@/lib/api'
import { formatRelativeTime } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'
import type { Album, Artist, HistoryEntry, Song } from '@/types'

type LibraryTab = 'tracks' | 'albums' | 'artists' | 'history'

/**
 * Bentuk data per tab — discriminated union supaya TypeScript bisa
 * mempersempit tipenya saat merender (`data.tab === 'tracks'` → `data.songs`).
 */
type LibraryData =
  | { tab: 'tracks'; songs: Song[] }
  | { tab: 'albums'; albums: Album[] }
  | { tab: 'artists'; artists: Artist[] }
  | { tab: 'history'; entries: HistoryEntry[] }

const TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: 'tracks', label: 'Lagu Disukai' },
  { id: 'albums', label: 'Album' },
  { id: 'artists', label: 'Artis' },
  { id: 'history', label: 'Riwayat' },
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
      if (tab === 'history') {
        return playerApi
          .getHistory({ limit: 100 })
          .then((page) => ({ tab: 'history' as const, entries: page.items }))
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

      {data.tab === 'history' &&
        (data.entries.length === 0 ? (
          <EmptyState message="Belum ada riwayat putar. Putar lagu mana pun, riwayatnya muncul di sini." />
        ) : (
          <HistoryList entries={data.entries} />
        ))}
    </div>
  )
}

/**
 * Daftar riwayat: lagu + kapan terakhir diputar. Barisnya kustom karena
 * SongRow tidak punya kolom waktu.
 */
function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const play = usePlayerStore((state) => state.play)
  const queue = entries.map((entry) => entry.song)

  return (
    <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-spotify-black/40">
      {entries.map((entry, index) => (
        <li
          key={`${entry.song.id}-${entry.played_at}-${index}`}
          className="group flex items-center gap-3 px-4 py-3.5"
        >
          <span className="w-6 text-right text-xs tabular-nums text-spotify-light-gray/60">
            {index + 1}
          </span>

          <button
            type="button"
            onClick={() => play(entry.song, queue)}
            className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
          >
            <span className="block truncate text-sm font-semibold text-spotify-white group-hover:text-spotify-green">
              {entry.song.title}
            </span>
            <span className="block truncate text-xs text-spotify-light-gray">
              {entry.song.artist?.name ?? 'Artis tidak diketahui'}
            </span>
          </button>

          <span className="shrink-0 text-xs text-spotify-light-gray">
            {formatRelativeTime(entry.played_at)}
          </span>
        </li>
      ))}
    </ul>
  )
}
