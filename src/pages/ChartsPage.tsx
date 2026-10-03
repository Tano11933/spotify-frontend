import { useState } from 'react'

import { ArtistCard } from '@/components/ArtistCard'
import { SongRow } from '@/components/SongRow'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { discoveryApi } from '@/lib/api'
import { cn } from '@/lib/cn'

type ChartTab = 'tracks' | 'artists'

const TABS: Array<{ id: ChartTab; label: string }> = [
  { id: 'tracks', label: 'Lagu' },
  { id: 'artists', label: 'Artis' },
]

/** Angka ribuan memakai format Indonesia (12.345, bukan 12,345). */
function formatPlays(plays: number): string {
  return `${plays.toLocaleString('id-ID')} putar`
}

/**
 * Chart publik: lagu dan artist paling banyak diputar 7 hari terakhir.
 *
 * Kedua daftar dimuat sekali bersama, jadi berpindah tab tidak memicu request
 * baru. Angka `plays` adalah data nyata dari materialized view backend.
 */
export function ChartsPage() {
  const [tab, setTab] = useState<ChartTab>('tracks')

  const { data, error, isLoading, reload } = useAsync(
    () =>
      Promise.all([
        discoveryApi.getTopTracks({ limit: 50 }),
        discoveryApi.getTopArtists({ limit: 50 }),
      ]).then(([tracks, artists]) => ({ tracks, artists })),
    [],
  )

  if (isLoading) return <LoadingState label="Memuat chart…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const { tracks, artists } = data

  return (
    <div className="pt-4">
      <h1 className="text-3xl font-bold text-spotify-white md:text-5xl">Chart</h1>
      <p className="mt-2 text-sm text-spotify-light-gray">
        Paling banyak diputar dalam 7 hari terakhir.
      </p>

      <div role="tablist" aria-label="Jenis chart" className="mt-8 mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-full px-4 py-3 text-sm font-semibold transition-colors sm:py-2',
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

      {tab === 'tracks' ? (
        tracks.items.length === 0 ? (
          <EmptyState message="Belum ada lagu yang diputar dalam 7 hari terakhir. Putar beberapa lagu dulu supaya chart terisi." />
        ) : (
          <ul className="flex flex-col">
            {tracks.items.map((song, index) => (
              <li key={song.id}>
                <SongRow
                  song={song}
                  index={index}
                  queue={tracks.items}
                  trailing={formatPlays(song.plays)}
                />
              </li>
            ))}
          </ul>
        )
      ) : artists.items.length === 0 ? (
        <EmptyState message="Belum ada artist yang diputar dalam 7 hari terakhir." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-6">
          {artists.items.map((artist) => (
            <li key={artist.id}>
              <ArtistCard artist={artist} meta={formatPlays(artist.plays)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
