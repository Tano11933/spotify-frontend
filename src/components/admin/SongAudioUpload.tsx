import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { adminApi, getApiErrorMessage } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'
import type { Song } from '@/types'

const maxBytes = 20 * 1024 * 1024

export function SongAudioUpload({ song, onUploaded }: { song: Song; onUploaded: (song: Song) => void }) {
  const id = useId()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<Song | null>(null)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => { request.current?.abort(); request.current = null }, [])

  async function upload() {
    if (!file || request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setProgress(null)
    setError(null)
    setMessage(null)
    setUploaded(null)
    try {
      const result = await adminApi.uploadAudio(song.id, file, {
        signal: controller.signal,
        onProgress: (value) => {
          if (request.current === controller && !controller.signal.aborted) setProgress(value)
        },
      })
      if (request.current !== controller || controller.signal.aborted) return
      onUploaded(result)
      setUploaded(result)
      setMessage('Audio berhasil disimpan. Putar untuk memeriksa hasilnya.')
    } catch (cause) {
      if (request.current !== controller || controller.signal.aborted) return
      setError(getApiErrorMessage(cause))
    } finally {
      if (request.current === controller) {
        request.current = null
        setBusy(false)
      }
    }
  }

  function cancel() {
    request.current?.abort()
    request.current = null
    setBusy(false)
    setProgress(null)
    setMessage('Permintaan dibatalkan. Jika file sudah terkirim, server mungkin sudah menyimpannya. Putar lagu untuk memeriksa sebelum mencoba lagi.')
  }

  return (
    <section aria-label={`Audio untuk ${song.title}`} className="mt-6 min-w-0 space-y-4 border-t border-spotify-border pt-5">
      <h3 className="text-base font-semibold text-spotify-white">Unggah atau ganti audio</h3>
      <p id={`${id}-hint`} className="text-sm text-spotify-light-gray">
        MP3 atau WAV PCM 8/16-bit, mono/stereo. Maksimal 20 MiB. File lama diganti setelah unggahan berhasil.
      </p>
      <label htmlFor={id} className="block text-sm font-medium text-spotify-white">File audio</label>
      <input
        id={id} type="file" accept=".mp3,.wav" disabled={busy}
        aria-describedby={`${id}-hint`} aria-invalid={Boolean(error)}
        className="block min-h-11 w-full min-w-0 rounded-md border border-spotify-light-gray p-2 text-sm text-spotify-white file:mr-3 file:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null
          setUploaded(null)
          setMessage(null)
          const problem = selected && (selected.size === 0 ? 'File audio kosong.'
            : selected.size > maxBytes ? 'Ukuran file melebihi 20 MiB.'
              : !/\.(mp3|wav)$/i.test(selected.name) ? 'Pilih file MP3 atau WAV.' : null)
          setError(problem || null)
          setFile(problem ? null : selected)
        }}
      />
      {busy && <div className="space-y-2" role="status">
        <p className="text-sm text-spotify-light-gray">{progress === 100 ? 'File terkirim. Memvalidasi dan menyimpan…' : progress === null ? 'Mengunggah audio…' : `Mengunggah audio: ${progress}%`}</p>
        <progress aria-label="Progress unggah audio" max={100} value={progress ?? undefined} className="block h-3 w-full accent-spotify-green" />
      </div>}
      {error && <p role="alert" className="text-sm text-spotify-white">{error}</p>}
      {message && <p role="status" className="text-sm text-spotify-light-gray">{message}</p>}
      <div className="flex flex-wrap gap-3">
        <Button disabled={!file || busy} className="min-h-11" onClick={() => void upload()}>
          {error && file ? 'Coba unggah lagi' : 'Unggah audio'}
        </Button>
        {busy && <Button variant="secondary" className="min-h-11" onClick={cancel}>Batalkan unggahan</Button>}
        {uploaded && <Button variant="secondary" className="min-h-11" onClick={() => usePlayerStore.getState().play(uploaded)}>Putar hasil unggah</Button>}
      </div>
    </section>
  )
}
