import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
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
  const { data, error, isLoading, reload } = useAsync(() => playerApi.getQueue({ limit: 100 }), [])
  const play = usePlayerStore((state) => state.play)
  const pushToast = useToastStore((state) => state.push)
  const [removingId, setRemovingId] = useState<number | null>(null)

  async function remove(songId: number) {
    setRemovingId(songId)
    try {
      await playerApi.removeFromQueue(songId)
      reload()
    } catch (removeError) {
      pushToast({ title: 'Gagal menghapus dari antrean', description: getApiErrorMessage(removeError), variant: 'error' })
    } finally {
      setRemovingId(null)
    }
  }

  if (isLoading) return <LoadingState label="Memuat antrean…" />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const songs = data?.items ?? []

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

      {songs.length === 0 ? (
        <EmptyState message="Antrean kosong. Tambahkan lagu lewat ikon daftar di baris lagu mana pun." />
      ) : (
        <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-spotify-black/40">
          {songs.map((song, index) => (
            <li key={`${song.id}-${index}`} className="group flex items-center gap-3 px-4 py-3.5">
              <span className="w-6 text-right text-xs tabular-nums text-spotify-light-gray/60">
                {index + 1}
              </span>

              <button
                type="button"
                onClick={() => play(song, songs)}
                className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
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
                disabled={removingId === song.id}
                aria-label={`Hapus ${song.title} dari antrean`}
                onClick={() => void remove(song.id)}
                className="shrink-0"
              >
                Hapus
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
