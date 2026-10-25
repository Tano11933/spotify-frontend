import { Link } from 'react-router'

import { LoadMore } from '@/components/LoadMore'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { Button } from '@/components/ui/Button'
import type { PagedListState } from '@/hooks/usePagedList'
import type { Playlist } from '@/types'

interface PlaylistListProps {
  title: string
  list: PagedListState<Playlist>
  selectedId?: number
  showOwner?: boolean
  disabled?: boolean
  onSelect: (playlist: Playlist) => void
}

export function PlaylistList({ title, list, selectedId, showOwner, disabled, onSelect }: PlaylistListProps) {
  return (
    <section aria-label={title} aria-busy={list.isLoading || list.isRefreshing}>
      <h2 className="mb-3 text-[1.05rem] font-bold text-spotify-white">{title}</h2>
      {list.isLoading ? <LoadingState label={`Memuat ${title.toLowerCase()}…`} /> :
        list.error && list.items.length === 0 ? <ErrorState message={list.error} onRetry={list.reload} /> : (
          <>
            {list.refreshError && (
              <div role="alert" className="mb-3 space-y-2 text-sm text-spotify-white">
                <p>Daftar belum diperbarui: {list.refreshError}</p>
                <Button variant="secondary" className="min-h-11" onClick={() => void list.refresh()}>Perbarui daftar</Button>
              </div>
            )}
            {list.isRefreshing && <p role="status" className="mb-3 text-sm text-spotify-light-gray">Memperbarui daftar…</p>}
            {list.items.length === 0 ? <EmptyState message={showOwner ? 'Belum ada playlist publik.' : 'Belum ada playlist. Gunakan formulir Buat playlist.'} /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {list.items.map((playlist) => (
                  <div key={playlist.id} className="min-w-0 rounded-lg border border-spotify-border bg-spotify-dark-gray p-4">
                    <button
                      type="button"
                      onClick={() => onSelect(playlist)}
                      disabled={disabled || list.isRefreshing || Boolean(list.refreshError)}
                      aria-pressed={selectedId === playlist.id}
                      className="min-h-11 w-full rounded-sm text-left text-spotify-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white disabled:opacity-50"
                    >
                      <span className="block break-words text-sm font-bold">{playlist.name}</span>
                      <span className="mt-1 block break-words text-sm text-spotify-light-gray">{playlist.description || 'Tanpa deskripsi'}</span>
                      <span className="mt-2 block text-xs text-spotify-light-gray">{selectedId === playlist.id ? 'Dipilih · ' : ''}{playlist.is_public ? 'Publik' : 'Pribadi'}</span>
                    </button>
                    {showOwner && playlist.user && (
                      <Link to={`/users/${playlist.user.id}`} className="mt-2 inline-flex min-h-11 items-center rounded-sm text-sm text-spotify-light-gray underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-spotify-white">
                        oleh {playlist.user.name}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!list.refreshError && <LoadMore shown={list.items.length} total={list.total} hasMore={list.hasMore} isLoadingMore={list.isLoadingMore || list.isRefreshing || Boolean(disabled)} error={list.error} onLoadMore={list.loadMore} label="playlist" />}
          </>
        )}
    </section>
  )
}
