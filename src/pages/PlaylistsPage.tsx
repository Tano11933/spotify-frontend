import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { getApiErrorMessage, catalogApi, playlistApi } from '@/lib/api'
import { formatDuration } from '@/lib/format'
import type { Playlist, Song } from '@/types'
import { usePlayerStore } from '@/store/playerStore'

export function PlaylistsPage() {
  const [mine, setMine] = useState<Playlist[]>([])
  const [publicPlaylists, setPublicPlaylists] = useState<Playlist[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [selected, setSelected] = useState<Playlist | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [songId, setSongId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const play = usePlayerStore((state) => state.play)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [owned, shared, catalog] = await Promise.all([
        playlistApi.getMine(),
        playlistApi.getPublic(),
        catalogApi.getSongs(),
      ])
      setMine(owned)
      setPublicPlaylists(shared)
      setSongs(catalog)
    } catch (loadError) {
      setError(getApiErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createPlaylist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    if (!name.trim()) return
    try {
      const playlist = await playlistApi.create({ name: name.trim(), description: description.trim(), is_public: isPublic })
      setMine((items) => [playlist, ...items])
      setSelected(playlist)
      setName('')
      setDescription('')
      setIsPublic(false)
      setMessage('Playlist berhasil dibuat.')
    } catch (createError) {
      setError(getApiErrorMessage(createError))
    }
  }

  async function addSong() {
    if (!selected || !songId) return
    try {
      await playlistApi.addSong(selected.id, Number(songId))
      setSelected(await playlistApi.getById(selected.id))
      setSongId('')
      setMessage('Lagu ditambahkan ke playlist.')
    } catch (addError) {
      setError(getApiErrorMessage(addError))
    }
  }

  async function removeSong(song: Song) {
    if (!selected) return
    try {
      await playlistApi.removeSong(selected.id, song.id)
      setSelected(await playlistApi.getById(selected.id))
    } catch (removeError) {
      setError(getApiErrorMessage(removeError))
    }
  }

  async function deletePlaylist() {
    if (!selected || !window.confirm(`Hapus playlist \u201c${selected.name}\u201d?`)) return
    try {
      await playlistApi.delete(selected.id)
      setMine((items) => items.filter((item) => item.id !== selected.id))
      setSelected(null)
      setMessage('Playlist dihapus.')
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError))
    }
  }

  if (isLoading) return <LoadingState />
  if (error && mine.length === 0 && publicPlaylists.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />
  }

  const selectedSongs = selected?.songs ?? []
  const isOwner = selected ? mine.some((p) => p.id === selected.id) : false

  return (
    <div className="space-y-8 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">Playlist</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-spotify-light-gray">Koleksi lagu untuk setiap suasana — pribadi atau dibagikan.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <svg viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" /></svg>
          <p className="text-sm leading-relaxed text-red-200">{error}</p>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-3 rounded-lg border border-spotify-green/20 bg-spotify-green/10 px-4 py-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-spotify-green" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
          <p className="text-sm leading-relaxed text-spotify-white">{message}</p>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-[1.05rem] font-bold tracking-tight text-spotify-white">Playlist saya</h2>
            {mine.length === 0 ? (
              <EmptyState message="Belum ada playlist. Buat playlist pertamamu di samping." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {mine.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => setSelected(playlist)}
                    className="group relative rounded-xl border bg-spotify-dark-gray p-4 text-left shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)] transition-all hover:border-white/10 hover:bg-spotify-elevated hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]"
                    style={{ borderColor: selected?.id === playlist.id ? 'rgba(29,185,84,0.4)' : 'rgba(255,255,255,0.06)' }}
                  >
                    {selected?.id === playlist.id && (
                      <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-spotify-green shadow-[0_0_8px_rgba(29,185,84,0.6)]" aria-hidden="true" />
                    )}
                    <p className="pr-4 text-sm font-bold leading-tight text-spotify-white group-hover:text-spotify-white">{playlist.name}</p>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-spotify-light-gray">{playlist.description || 'Tanpa deskripsi'}</p>
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-spotify-light-gray">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: playlist.is_public ? 'var(--color-spotify-green)' : 'var(--color-spotify-light-gray)' }} aria-hidden="true" />
                      {playlist.is_public ? 'Publik' : 'Pribadi'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-[1.05rem] font-bold tracking-tight text-spotify-white">Playlist publik</h2>
            {publicPlaylists.length === 0 ? (
              <EmptyState message="Belum ada playlist publik." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {publicPlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => setSelected(playlist)}
                    className="group rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-4 text-left shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)] transition-all hover:border-white/10 hover:bg-spotify-elevated"
                  >
                    <p className="text-sm font-bold leading-tight text-spotify-white">{playlist.name}</p>
                    <p className="mt-1 text-sm text-spotify-light-gray">oleh {playlist.user?.name ?? 'user'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => void createPlaylist(e)}
          className="h-fit space-y-4 rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-6 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]"
        >
          <div>
            <h2 className="text-[1.1rem] font-bold tracking-tight text-spotify-white">Buat playlist</h2>
            <p className="mt-1 text-sm leading-relaxed text-spotify-light-gray">Nama yang jelas membantu kamu menemukannya lagi nanti.</p>
          </div>

          <Input
            label="Nama playlist"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
            placeholder="mis. Chill Malam"
            hint={`${name.length}/200`}
          />
          <Textarea
            label="Deskripsi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Ceritakan suasana playlist ini…"
            rows={3}
            hint={`${description.length}/1000`}
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.06] bg-spotify-elevated px-4 py-3 transition-colors hover:border-white/10 has-[input:checked]:border-spotify-green/30 has-[input:checked]:bg-spotify-green/10">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 accent-spotify-green"
            />
            <span className="flex-1">
              <span className="text-sm font-semibold text-spotify-white">Jadikan publik</span>
              <span className="block text-xs leading-relaxed text-spotify-light-gray">Orang lain bisa menemukan & memutar playlist ini</span>
            </span>
          </label>

          <Button type="submit" className="w-full py-3.5">
            Buat playlist
          </Button>
        </form>
      </section>

      {selected && (
        <section className="rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-6 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-spotify-white md:text-2xl">{selected.name}</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-spotify-light-gray">{selected.description || 'Tanpa deskripsi'}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-widest text-spotify-light-gray/60">{selectedSongs.length} lagu</p>
            </div>
            {isOwner && (
              <Button variant="secondary" size="sm" onClick={() => void deletePlaylist()}>
                Hapus playlist
              </Button>
            )}
          </div>

          {isOwner && (
            <div className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border border-white/[0.06] bg-spotify-elevated p-4">
              <div className="min-w-60 flex-1">
                <Select
                  label="Tambah lagu"
                  value={songId}
                  onChange={(e) => setSongId(e.target.value)}
                  placeholder="Pilih lagu untuk ditambahkan"
                >
                  {songs
                    .filter((song) => !selectedSongs.some((item) => item.id === song.id))
                    .map((song) => (
                      <option key={song.id} value={song.id}>
                        {song.title} — {song.artist?.name ?? ''}
                      </option>
                    ))}
                </Select>
              </div>
              <Button size="sm" onClick={() => void addSong()} disabled={!songId} className="shrink-0">
                Tambah lagu
              </Button>
            </div>
          )}

          {selectedSongs.length === 0 ? (
            <div className="mt-6">
              <EmptyState message="Playlist ini belum memiliki lagu." />
            </div>
          ) : (
            <div className="mt-6 divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-spotify-black/40">
              {selectedSongs.map((song, index) => (
                <div key={song.id} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.04]">
                  <span className="w-6 text-right text-xs tabular-nums text-spotify-light-gray/60">{index + 1}</span>
                  <button type="button" onClick={() => play(song, selectedSongs)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-spotify-white group-hover:text-spotify-green">{song.title}</span>
                    <span className="block truncate text-xs text-spotify-light-gray">{song.artist?.name ?? ''}</span>
                  </button>
                  <span className="shrink-0 text-xs tabular-nums text-spotify-light-gray">{formatDuration(song.duration)}</span>
                  {isOwner && (
                    <Button variant="ghost" size="sm" onClick={() => void removeSong(song)} className="shrink-0 opacity-0 group-hover:opacity-100">
                      Hapus
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
