import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'

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
  const { isLoading: isLoadingQueue, refresh: refreshQueue } = list
  useEffect(() => {
    if (previousRevision.current === revision || isLoadingQueue) return
    previousRevision.current = revision
    void refreshQueue()
  }, [revision, isLoadingQueue, refreshQueue])
  const pushToast = useToastStore((state) => state.push)
  const [isMutating, setIsMutating] = useState(false)
  const pendingRef = useRef(false)
  const moveFocus = useRef<HTMLButtonElement | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const canEdit = !isMutating && !isAdvancing && !list.isRefreshing && !list.refreshError

  useEffect(() => {
    if (isMutating || !moveFocus.current) return
    const control = moveFocus.current
    moveFocus.current = null
    if (document.activeElement !== document.body) return
    if (control.isConnected) control.focus({ preventScroll: true })
    else heading.current?.focus()
  }, [isMutating])

  async function editQueue(action: () => Promise<void>, onError: (cause: unknown) => void, refreshAfterError = false) {
    if (pendingRef.current || !canEdit) return
    pendingRef.current = true
    setIsMutating(true)
    try {
      try {
        await action()
      } catch (cause) {
        onError(cause)
        if (!refreshAfterError) return
      }
      await list.refresh()
    } finally {
      pendingRef.current = false
      setIsMutating(false)
    }
  }

  function remove(entryId: number) {
    return editQueue(async () => { await playerApi.removeQueueEntry(entryId) }, (cause) => {
      pushToast({ title: 'Gagal menghapus dari antrean', description: getApiErrorMessage(cause), variant: 'error' })
    })
  }

  function move(entryId: number, direction: 'up' | 'down', control: HTMLButtonElement) {
    return editQueue(async () => {
      if (control === document.activeElement) moveFocus.current = control
      const result = await playerApi.moveQueueEntry(entryId, direction)
      if (result.moved) pushToast({ title: 'Urutan antrean diperbarui', variant: 'success' })
    }, (cause) => {
      const description = isAxiosError(cause) && cause.response?.status === 409
        ? 'Salah satu lagu sedang disiapkan untuk diputar. Coba lagi setelah proses selesai.'
        : getApiErrorMessage(cause)
      pushToast({ title: 'Gagal mengubah urutan antrean', description, variant: 'error' })
    }, true)
  }

  if (list.isLoading) return <LoadingState label="Memuat antrean…" />
  if (list.error && list.items.length === 0) return <ErrorState message={list.error} onRetry={list.reload} />

  const entries = list.items

  return (
    <div className="pt-4">
      <div className="mb-8">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">
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
            <li key={entry.id} className="group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2 px-2 py-3.5 sm:flex sm:gap-3 sm:px-4">
              <span className="w-6 text-right text-xs tabular-nums text-spotify-light-gray">
                {index + 1}
              </span>

              <button
                type="button"
                onClick={() => play(entry.id)}
                disabled={!canEdit}
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

              <div className="col-span-3 flex flex-wrap items-center justify-end gap-1 sm:shrink-0">
                {(['up', 'down'] as const).map((direction) => {
                  const label = direction === 'up' ? 'Naik' : 'Turun'
                  const disabled = !canEdit || (direction === 'up' ? index === 0 : index + 1 >= list.total)
                  return (
                    <Button
                      key={direction}
                      variant="ghost"
                      size="sm"
                      aria-disabled={disabled}
                      aria-label={`${label} ${song.title}, posisi ${index + 1}`}
                      className="min-h-11 min-w-11 aria-disabled:opacity-50"
                      onClick={(event) => {
                        if (!disabled) void move(entry.id, direction, event.currentTarget)
                      }}
                    >
                      {label}
                    </Button>
                  )
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canEdit}
                  aria-label={`Hapus ${song.title} dari antrean`}
                  onClick={() => void remove(entry.id)}
                  className="min-h-11 shrink-0"
                >
                  Hapus
                </Button>
              </div>
            </li>
          )})}
        </ul>
      )}
      {!list.refreshError && <LoadMore shown={entries.length} total={list.total} hasMore={list.hasMore} isLoadingMore={list.isLoadingMore} disabled={!canEdit} error={list.error} onLoadMore={list.loadMore} label="entri antrean" />}
    </div>
  )
}
