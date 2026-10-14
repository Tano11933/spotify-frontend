import { useState } from 'react'

import { AlbumCard } from '@/components/AlbumCard'
import { ArtistCard } from '@/components/ArtistCard'
import { LoadMore } from '@/components/LoadMore'
import { SectionGrid } from '@/components/SectionGrid'
import { SongRow } from '@/components/SongRow'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { usePagedList } from '@/hooks/usePagedList'
import { cn } from '@/lib/cn'
import { libraryApi, playerApi } from '@/lib/api'
import { formatRelativeTime } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'
import type { Album, Artist, HistoryEntry, Song } from '@/types'

type LibraryTab = 'tracks' | 'albums' | 'artists' | 'history'

const TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: 'tracks', label: 'Lagu Disukai' },
  { id: 'albums', label: 'Album' },
  { id: 'artists', label: 'Artis' },
  { id: 'history', label: 'Riwayat' },
]

/**
 * Halaman library pribadi: lagu disukai, album tersimpan, artist diikuti, dan
 * riwayat putar.
 *
 * Setiap tab adalah komponen sendiri (lihat di bawah) supaya hanya tab AKTIF
 * yang memuat data: hook paginasi milik tab ter-mount saat tabnya tampil dan
 * ter-unmount saat ditinggalkan. Header dan tablist tetap di sini supaya tidak
 * ikut berkedip saat data tab dimuat.
 */
export function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>('tracks')

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

      {tab === 'tracks' && <TracksTab />}
      {tab === 'albums' && <AlbumsTab />}
      {tab === 'artists' && <ArtistsTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  )
}

function TracksTab() {
  const { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, reload } =
    usePagedList<Song>((params) => libraryApi.getTracks(params))

  if (isLoading) return <LoadingState />
  if (error && items.length === 0) return <ErrorState message={error} onRetry={reload} />
  if (items.length === 0) {
    return (
      <EmptyState message="Belum ada lagu disukai. Tekan ikon hati pada lagu mana pun untuk menyimpannya." />
    )
  }

  return (
    <>
      <ul className="flex flex-col">
        {items.map((song, index) => (
          <li key={song.id}>
            <SongRow song={song} index={index} queue={items} />
          </li>
        ))}
      </ul>

      <LoadMore
        shown={items.length}
        total={total}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        error={error}
        onLoadMore={loadMore}
        label="lagu"
      />
    </>
  )
}

function AlbumsTab() {
  const { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, reload } =
    usePagedList<Album>((params) => libraryApi.getAlbums(params))

  if (isLoading) return <LoadingState />
  if (error && items.length === 0) return <ErrorState message={error} onRetry={reload} />
  if (items.length === 0) {
    return <EmptyState message="Belum ada album tersimpan. Buka sebuah album lalu tekan Simpan." />
  }

  return (
    <>
      <SectionGrid title="Album tersimpan">
        {items.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </SectionGrid>

      <LoadMore
        shown={items.length}
        total={total}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        error={error}
        onLoadMore={loadMore}
        label="album"
      />
    </>
  )
}

function ArtistsTab() {
  const { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, reload } =
    usePagedList<Artist>((params) => libraryApi.getFollowing(params))

  if (isLoading) return <LoadingState />
  if (error && items.length === 0) return <ErrorState message={error} onRetry={reload} />
  if (items.length === 0) {
    return <EmptyState message="Belum ada artist yang diikuti. Buka halaman artist lalu tekan Ikuti." />
  }

  return (
    <>
      <SectionGrid title="Artis yang diikuti">
        {items.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </SectionGrid>

      <LoadMore
        shown={items.length}
        total={total}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        error={error}
        onLoadMore={loadMore}
        label="artis"
      />
    </>
  )
}

function HistoryTab() {
  const { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, reload } =
    usePagedList<HistoryEntry>((params) => playerApi.getHistory(params))

  if (isLoading) return <LoadingState />
  if (error && items.length === 0) return <ErrorState message={error} onRetry={reload} />
  if (items.length === 0) {
    return <EmptyState message="Belum ada riwayat putar. Putar lagu mana pun, riwayatnya muncul di sini." />
  }

  return (
    <>
      <HistoryList entries={items} />

      <LoadMore
        shown={items.length}
        total={total}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        error={error}
        onLoadMore={loadMore}
        label="riwayat"
      />
    </>
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
