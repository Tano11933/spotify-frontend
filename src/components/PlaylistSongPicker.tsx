import { useState } from 'react'

import { LoadMore } from '@/components/LoadMore'
import { ErrorState, LoadingState } from '@/components/StateMessage'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { usePagedList } from '@/hooks/usePagedList'
import { catalogApi } from '@/lib/api'
import type { Song } from '@/types'

interface PlaylistSongPickerProps {
  selectedSongs: Song[]
  disabled: boolean
  onAdd: (songId: number) => Promise<boolean>
}

export function PlaylistSongPicker({ selectedSongs, disabled, onAdd }: PlaylistSongPickerProps) {
  const catalog = usePagedList((params) => catalogApi.getSongs(params))
  const [songId, setSongId] = useState('')
  const available = catalog.items.filter((song) => !selectedSongs.some((item) => item.id === song.id))
  const validSelection = available.some((song) => String(song.id) === songId)

  async function add() {
    if (!validSelection || disabled) return
    if (await onAdd(Number(songId))) setSongId('')
  }

  return (
    <section aria-label="Tambah lagu ke playlist" className="mt-6 rounded-lg border border-spotify-border bg-spotify-elevated p-4">
      {catalog.isLoading ? <LoadingState label="Memuat pilihan lagu…" /> : catalog.error && catalog.items.length === 0 ? (
        <ErrorState message={catalog.error} onRetry={catalog.reload} />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 basis-60 flex-1">
              <Select label="Tambah lagu" value={validSelection ? songId : ''} onChange={(event) => setSongId(event.target.value)} disabled={disabled} placeholder="Pilih lagu untuk ditambahkan">
                {available.map((song) => <option key={song.id} value={song.id}>{song.title} • {song.artist?.name ?? ''}</option>)}
              </Select>
            </div>
            <Button className="min-h-11" disabled={disabled || !validSelection} onClick={() => void add()}>Tambah lagu</Button>
          </div>
          {available.length === 0 && <p className="mt-3 text-sm text-spotify-light-gray">{catalog.hasMore ? 'Semua lagu yang dimuat sudah ada di playlist. Muat lagi untuk melihat pilihan berikutnya.' : 'Tidak ada lagu lain untuk ditambahkan.'}</p>}
          <LoadMore shown={catalog.items.length} total={catalog.total} hasMore={catalog.hasMore} isLoadingMore={catalog.isLoadingMore} error={catalog.error} onLoadMore={catalog.loadMore} label="lagu katalog" />
        </>
      )}
    </section>
  )
}
