import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { LoadMore } from '@/components/LoadMore'
import { usePagedList } from '@/hooks/usePagedList'
import { getApiErrorMessage, playerApi } from '@/lib/api'
import { formatDuration } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'

/**
 * Antrean "berikutnya" milik user, tersimpan di server sehingga isinya sama
 * di semua device. Berbeda dari antrean pemutar lokal, yang merupakan konteks
 * lagu sedang diputar (album/playlist).
 */
export function QueuePage() {
  const list = usePagedList((params) => playerApi.getQueueEntries(params))
  const play = usePlayerStore((state) => state.playQueueEntry)
  const revision = usePlayerStore((state) => state.queueRevision)
  const isAdvancing = usePlayerStore((state) => state.isAdvancing)
  const previousRevision = useRef(revision)
  useEffect(() => {
    if (previousRevision.current === revision || list.isLoading) return
    previousRevision.current = revision
    void list.refresh()
  }, [revision, list.isLoading, list.refresh])
  const pushToast = useToastStore((state) => state.push)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const pendingRef = useRef(false)

  async function remove(entryId: number) {
    if (pendingRef.current || list.isRefreshing || list.refreshError) return
    pendingRef.current = true
    setRemovingId(entryId)
    try {
      await playerApi.removeQueueEntry(entryId)
      await list.refresh()
    } catch (removeError) {
      pushToast({ title: 'Gagal menghapus dari antrean', description: getApiErrorMessage(removeError), variant: 'error' })
    } finally {
      setRemovingId(null)
      pendingRef.current = false
    }
  }

  if (list.isLoading) return <LoadingState label="Memuat antrean…" />
  if (list.error && list.items.length === 0) return <ErrorState message={list.error} onRetry={list.reload} />

  const entries = list.items

  return (
    <div className="pt-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">
          Antrean berikutnya
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-spotify-light-gray">
          Lagu yang kamu antrekan tersimpan di akunmu dan siap diputar dari device mana pun.
        </p>
      </div>

      {list.refreshError && <div role="alert" className="mb-4 space-y-2 text-sm text-spotify-white">
        <p>Antrean belum diperbarui: {list.refreshError}</p>
        <Button variant="secondary" className="min-h-11" onClick={() => void list.refresh()}>Perbarui antrean</Button>
      </div>}
      {list.isRefreshing && <p role="status" className="mb-4 text-sm text-spotify-light-gray">Memperbarui antrean…</p>}

      {entries.length === 0 ? (
        <EmptyState message="Antrean kosong. Tambahkan lagu lewat ikon daftar di baris lagu mana pun." />
      ) : (
        <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-spotify-black/40">
          {entries.map((entry, index) => {
            const song = entry.song
            return (
            <li key={entry.id} className="group flex items-center gap-2 px-2 py-3.5 sm:gap-3 sm:px-4">
              <span className="w-6 text-right text-xs tabular-nums text-spotify-light-gray/60">
                {index + 1}
              </span>

              <button
                type="button"
                onClick={() => play(entry.id)}
                disabled={isAdvancing || removingId !== null || list.isRefreshing || Boolean(list.refreshError)}
                className="min-h-11 min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
              >
                <span className="block truncate text-sm font-semibold text-spotify-white group-hover:text-spotify-green">
                  {song.title}
                </span>
                <span className="block truncate text-xs text-spotify-light-gray">
                  {song.artist?.name ?? 'Artis tidak diketahui'}
                </span>
              </button>

              <span className="shrink-0 text-xs tabular-nums text-spotify-light-gray">
                {formatDuration(song.duration)}
              </span>

              <Button
                variant="ghost"
                size="sm"
                disabled={removingId !== null || list.isRefreshing || Boolean(list.refreshError)}
                aria-label={`Hapus ${song.title} dari antrean`}
                onClick={() => void remove(entry.id)}
                className="min-h-11 shrink-0"
              >
                Hapus
              </Button>
            </li>
          )})}
        </ul>
      )}
      {!list.refreshError && <LoadMore shown={entries.length} total={list.total} hasMore={list.hasMore} isLoadingMore={list.isLoadingMore || list.isRefreshing || removingId !== null} error={list.error} onLoadMore={list.loadMore} label="entri antrean" />}
    </div>
  )
}
