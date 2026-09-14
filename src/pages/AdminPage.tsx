import { useEffect, useState } from 'react'

import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { catalogApi, adminApi, getApiErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Album, Artist, Song } from '@/types'

type Tab = 'artists' | 'albums' | 'songs'

const emptyArtist = { name: '', bio: '', image_url: '' }
const emptyAlbum = { title: '', cover_url: '', release_date: '', artist_id: '' }
const emptySong = { title: '', duration: '', file_url: '', artist_id: '', album_id: '' }

export function AdminPage() {
  const user = useAuthStore((state) => state.user)
  const [tab, setTab] = useState<Tab>('artists')
  const [artists, setArtists] = useState<Artist[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [artistForm, setArtistForm] = useState(emptyArtist)
  const [albumForm, setAlbumForm] = useState(emptyAlbum)
  const [songForm, setSongForm] = useState(emptySong)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function loadCatalog() {
    setIsLoading(true)
    setError(null)
    try {
      const [nextArtists, nextAlbums, nextSongs] = await Promise.all([
        catalogApi.getArtists(),
        catalogApi.getAlbums(),
        catalogApi.getSongs(),
      ])
      setArtists(nextArtists)
      setAlbums(nextAlbums)
      setSongs(nextSongs)
    } catch (loadError) {
      setError(getApiErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void loadCatalog()
  }, [user?.role])

  function resetForm() {
    setEditingId(null)
    setArtistForm(emptyArtist)
    setAlbumForm(emptyAlbum)
    setSongForm(emptySong)
  }

  function startArtistEdit(artist: Artist) {
    setTab('artists')
    setEditingId(artist.id)
    setArtistForm({ name: artist.name, bio: artist.bio, image_url: artist.image_url })
  }

  function startAlbumEdit(album: Album) {
    setTab('albums')
    setEditingId(album.id)
    setAlbumForm({
      title: album.title,
      cover_url: album.cover_url,
      release_date: album.release_date.slice(0, 10),
      artist_id: String(album.artist_id),
    })
  }

  function startSongEdit(song: Song) {
    setTab('songs')
    setEditingId(song.id)
    setSongForm({
      title: song.title,
      duration: String(song.duration),
      file_url: song.file_url,
      artist_id: String(song.artist_id),
      album_id: song.album_id ? String(song.album_id) : '',
    })
  }

  async function submitArtist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      if (editingId) await adminApi.updateArtist(editingId, artistForm)
      else await adminApi.createArtist(artistForm)
      resetForm()
      setMessage('Artist berhasil disimpan.')
      await loadCatalog()
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    }
  }

  async function submitAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const payload = { ...albumForm, artist_id: Number(albumForm.artist_id) }
      if (editingId) await adminApi.updateAlbum(editingId, payload)
      else await adminApi.createAlbum(payload)
      resetForm()
      setMessage('Album berhasil disimpan.')
      await loadCatalog()
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    }
  }

  async function submitSong(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const payload = {
        title: songForm.title,
        duration: Number(songForm.duration),
        file_url: songForm.file_url,
        artist_id: Number(songForm.artist_id),
        album_id: songForm.album_id ? Number(songForm.album_id) : null,
      }
      if (editingId) await adminApi.updateSong(editingId, payload)
      else await adminApi.createSong(payload)
      resetForm()
      setMessage('Lagu berhasil disimpan.')
      await loadCatalog()
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    }
  }

  async function remove(kind: Tab, id: number) {
    if (!window.confirm('Hapus data ini?')) return
    try {
      if (kind === 'artists') await adminApi.deleteArtist(id)
      if (kind === 'albums') await adminApi.deleteAlbum(id)
      if (kind === 'songs') await adminApi.deleteSong(id)
      setMessage('Data berhasil dihapus.')
      if (editingId === id) resetForm()
      await loadCatalog()
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError))
    }
  }

  if (user?.role !== 'admin') return <ErrorState message="Halaman ini hanya dapat diakses admin." />
  if (isLoading) return <LoadingState />

  const formTitle = editingId ? 'Edit data' : 'Tambah data'

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-spotify-green/20 bg-spotify-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-spotify-green">
          <span className="h-1.5 w-1.5 rounded-full bg-spotify-green" aria-hidden="true" />
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-spotify-white md:text-5xl">Kelola katalog</h1>
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-spotify-light-gray">
          Tambah, perbarui, atau hapus data yang tampil di aplikasi. Perubahan langsung tayang setelah disimpan.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <svg viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
          </svg>
          <p className="text-sm leading-relaxed text-red-200">{error}</p>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-3 rounded-lg border border-spotify-green/20 bg-spotify-green/10 px-4 py-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-spotify-green" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm leading-relaxed text-spotify-white">{message}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3">
        {(['artists', 'albums', 'songs'] as Tab[]).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={tab === item ? 'primary' : 'ghost'}
            onClick={() => {
              setTab(item)
              resetForm()
            }}
          >
            {item === 'artists' ? 'Artist' : item === 'albums' ? 'Album' : 'Lagu'}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Daftar */}
        <section className="min-w-0 rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]">
          <h2 className="mb-4 text-[1.1rem] font-bold text-spotify-white">
            {tab === 'artists' ? 'Daftar artist' : tab === 'albums' ? 'Daftar album' : 'Daftar lagu'}
          </h2>

          {tab === 'artists' &&
            (artists.length === 0 ? (
              <EmptyState message="Belum ada artist." />
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {artists.map((artist) => (
                  <div key={artist.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-spotify-white">{artist.name}</p>
                      <p className="truncate text-sm leading-relaxed text-spotify-light-gray">{artist.bio || 'Tanpa bio'}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => startArtistEdit(artist)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove('artists', artist.id)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {tab === 'albums' &&
            (albums.length === 0 ? (
              <EmptyState message="Belum ada album." />
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {albums.map((album) => (
                  <div key={album.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-spotify-white">{album.title}</p>
                      <p className="truncate text-sm text-spotify-light-gray">{album.artist?.name ?? `Artist #${album.artist_id}`}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => startAlbumEdit(album)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove('albums', album.id)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {tab === 'songs' &&
            (songs.length === 0 ? (
              <EmptyState message="Belum ada lagu." />
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {songs.map((song) => (
                  <div key={song.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-spotify-white">{song.title}</p>
                      <p className="truncate text-sm text-spotify-light-gray">
                        {song.artist?.name ?? `Artist #${song.artist_id}`} · {song.duration} detik
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => startSongEdit(song)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove('songs', song.id)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </section>

        {/* Form */}
        <section className="h-fit rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-6 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] xl:sticky xl:top-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[1.1rem] font-bold text-spotify-white">{formTitle}</h2>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Batal
              </Button>
            )}
          </div>

          {tab === 'artists' && (
            <form onSubmit={(e) => void submitArtist(e)} className="space-y-4">
              <Input
                label="Nama artist"
                value={artistForm.name}
                onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })}
                placeholder="mis. Tulus"
                required
              />
              <Textarea
                label="Bio"
                value={artistForm.bio}
                onChange={(e) => setArtistForm({ ...artistForm, bio: e.target.value })}
                placeholder="Cerita singkat tentang artist…"
                rows={4}
                hint="Opsional, akan tampil di halaman detail"
              />
              <Input
                label="URL gambar"
                value={artistForm.image_url}
                onChange={(e) => setArtistForm({ ...artistForm, image_url: e.target.value })}
                placeholder="https://…"
                type="url"
                hint="Kosongkan jika belum ada foto"
              />
              <Button type="submit" className="w-full py-3.5">
                Simpan artist
              </Button>
            </form>
          )}

          {tab === 'albums' && (
            <form onSubmit={(e) => void submitAlbum(e)} className="space-y-4">
              <Input
                label="Judul album"
                value={albumForm.title}
                onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                placeholder="mis. Manusia"
                required
              />
              <Select
                label="Artist"
                value={albumForm.artist_id}
                onChange={(e) => setAlbumForm({ ...albumForm, artist_id: e.target.value })}
                placeholder="Pilih artist"
                required
              >
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Tanggal rilis"
                value={albumForm.release_date}
                onChange={(e) => setAlbumForm({ ...albumForm, release_date: e.target.value })}
                type="date"
                required
              />
              <Input
                label="URL cover"
                value={albumForm.cover_url}
                onChange={(e) => setAlbumForm({ ...albumForm, cover_url: e.target.value })}
                placeholder="https://…"
                type="url"
                hint="Opsional, pakai placeholder bila kosong"
              />
              <Button type="submit" className="w-full py-3.5">
                Simpan album
              </Button>
            </form>
          )}

          {tab === 'songs' && (
            <form onSubmit={(e) => void submitSong(e)} className="space-y-4">
              <Input
                label="Judul lagu"
                value={songForm.title}
                onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                placeholder="mis. Hati-Hati di Jalan"
                required
              />
              <Input
                label="Durasi (detik)"
                value={songForm.duration}
                onChange={(e) => setSongForm({ ...songForm, duration: e.target.value })}
                placeholder="210"
                type="number"
                min={1}
                required
                hint="Angka bulat, dalam detik"
              />
              <Select
                label="Artist"
                value={songForm.artist_id}
                onChange={(e) => setSongForm({ ...songForm, artist_id: e.target.value })}
                required
                placeholder="Pilih artist"
              >
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Album"
                value={songForm.album_id}
                onChange={(e) => setSongForm({ ...songForm, album_id: e.target.value })}
                placeholder="Tanpa album"
                hint="Disaring otomatis sesuai artist"
              >
                <option value="">Tanpa album</option>
                {albums
                  .filter((album) => !songForm.artist_id || album.artist_id === Number(songForm.artist_id))
                  .map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title}
                    </option>
                  ))}
              </Select>
              <Input
                label="URL file audio"
                value={songForm.file_url}
                onChange={(e) => setSongForm({ ...songForm, file_url: e.target.value })}
                placeholder="https://…"
                type="url"
                hint="Harus bisa diputar langsung di browser"
              />
              <Button type="submit" className="w-full py-3.5">
                Simpan lagu
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
