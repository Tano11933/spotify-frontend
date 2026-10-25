import { useRef, useState } from 'react'

import { PlaylistList } from '@/components/PlaylistList'
import { PlaylistSongPicker } from '@/components/PlaylistSongPicker'
import { EmptyState } from '@/components/StateMessage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { usePagedList } from '@/hooks/usePagedList'
import { getApiErrorMessage, playlistApi } from '@/lib/api'
import { formatDuration } from '@/lib/format'
import { useAuthStore } from '@/store/authStore'
import { usePlayerStore } from '@/store/playerStore'
import type { Playlist, Song } from '@/types'

export function PlaylistsPage() {
  const userId = useAuthStore((state) => state.user?.id)
  const mine = usePagedList((params) => playlistApi.getMine(params), [userId])
  const shared = usePagedList((params) => playlistApi.getPublic(params), [userId])
  const [selected, setSelected] = useState<Playlist | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [busy, setBusy] = useState(false)
  const pendingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const play = usePlayerStore((state) => state.play)

  function beginMutation() {
    if (pendingRef.current) return false
    pendingRef.current = true
    setBusy(true)
    setError(null)
    setMessage(null)
    return true
  }

  function finishMutation() {
    pendingRef.current = false
    setBusy(false)
  }

  async function refreshLists() {
    await Promise.all([mine.refresh(), shared.refresh()])
  }

  async function createPlaylist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !beginMutation()) return
    try {
      const playlist = await playlistApi.create({ name: name.trim(), description: description.trim(), is_public: isPublic })
      setSelected(playlist)
      setName('')
      setDescription('')
      setIsPublic(false)
      setMessage('Playlist berhasil dibuat.')
      await refreshLists()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    } finally {
      finishMutation()
    }
  }

  async function addSong(songId: number): Promise<boolean> {
    if (!selected || !beginMutation()) return false
    const playlistId = selected.id
    try {
      await playlistApi.addSong(playlistId, songId)
      const detail = await playlistApi.getById(playlistId)
      setSelected((current) => current?.id === playlistId ? detail : current)
      setMessage('Lagu ditambahkan ke playlist.')
      await refreshLists()
      return true
    } catch (cause) {
      setError(getApiErrorMessage(cause))
      return false
    } finally {
      finishMutation()
    }
  }

  async function removeSong(song: Song) {
    if (!selected || !beginMutation()) return
    const playlistId = selected.id
    try {
      await playlistApi.removeSong(playlistId, song.id)
      const detail = await playlistApi.getById(playlistId)
      setSelected((current) => current?.id === playlistId ? detail : current)
      setMessage('Lagu dihapus dari playlist.')
      await refreshLists()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    } finally {
      finishMutation()
    }
  }

  async function deletePlaylist() {
    if (!selected || pendingRef.current || !window.confirm('Hapus playlist “' + selected.name + '”?')) return
    if (!beginMutation()) return
    try {
      await playlistApi.delete(selected.id)
      setSelected(null)
      setMessage('Playlist dihapus.')
      await refreshLists()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    } finally {
      finishMutation()
    }
  }

  const selectedSongs = selected?.songs ?? []
  const isOwner = Boolean(userId && selected?.user_id === userId)

  return (
    <div className="space-y-8 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">Playlist</h1>
        <p className="mt-2 text-[0.9375rem] text-spotify-light-gray">Koleksi lagu untuk setiap suasana, pribadi atau dibagikan.</p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-spotify-border px-4 py-3 text-sm text-spotify-white">{error}</p>}
      {message && <p role="status" className="text-sm text-spotify-white">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <PlaylistList title="Playlist saya" list={mine} selectedId={selected?.id} disabled={busy} onSelect={setSelected} />
          <PlaylistList title="Playlist publik" list={shared} selectedId={selected?.id} disabled={busy} showOwner onSelect={setSelected} />
        </div>

        <form onSubmit={(event) => void createPlaylist(event)} className="h-fit min-w-0 space-y-4 rounded-lg border border-spotify-border bg-spotify-dark-gray p-4 sm:p-6">
          <h2 className="text-lg font-bold text-spotify-white">Buat playlist</h2>
          <Input label="Nama playlist" value={name} onChange={(event) => setName(event.target.value)} disabled={busy} required maxLength={200} placeholder="mis. Chill Malam" />
          <Textarea label="Deskripsi" value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} maxLength={1000} rows={3} placeholder="Ceritakan suasana playlist ini…" />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-spotify-white">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} disabled={busy} className="h-5 w-5 accent-spotify-green" />
            Jadikan publik
          </label>
          <Button type="submit" disabled={busy} className="min-h-11 w-full">{busy ? 'Menyimpan…' : 'Buat playlist'}</Button>
        </form>
      </div>

      {selected && (
        <section aria-label="Detail playlist" className="min-w-0 rounded-lg border border-spotify-border bg-spotify-dark-gray p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold text-spotify-white">{selected.name}</h2>
              <p className="mt-1.5 break-words text-sm text-spotify-light-gray">{selected.description || 'Tanpa deskripsi'}</p>
              <p className="mt-2 text-xs text-spotify-light-gray">{selectedSongs.length} lagu</p>
            </div>
            {isOwner && <Button variant="secondary" className="min-h-11" disabled={busy} onClick={() => void deletePlaylist()}>Hapus playlist</Button>}
          </div>

          {isOwner && <PlaylistSongPicker key={selected.id} selectedSongs={selectedSongs} disabled={busy} onAdd={addSong} />}

          {selectedSongs.length === 0 ? <EmptyState message="Playlist ini belum memiliki lagu." /> : (
            <ol className="mt-6 divide-y divide-spotify-border">
              {selectedSongs.map((song, index) => (
                <li key={song.id} className="flex items-center gap-2 py-3 sm:gap-3">
                  <span className="w-6 shrink-0 text-right text-xs text-spotify-light-gray">{index + 1}</span>
                  <button type="button" onClick={() => play(song, selectedSongs)} className="min-h-11 min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white">
                    <span className="block truncate text-sm font-semibold text-spotify-white">{song.title}</span>
                    <span className="block truncate text-xs text-spotify-light-gray">{song.artist?.name ?? ''}</span>
                  </button>
                  <span className="shrink-0 text-xs text-spotify-light-gray">{formatDuration(song.duration)}</span>
                  {isOwner && <Button variant="ghost" size="sm" disabled={busy} aria-label={'Hapus ' + song.title + ' dari playlist'} className="min-h-11 shrink-0" onClick={() => void removeSong(song)}>Hapus</Button>}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  )
}
