import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  adminApi: { uploadAudio: vi.fn() },
  getApiErrorMessage: (cause: Error) => cause.message,
}))

import { SongAudioUpload } from './SongAudioUpload'
import { adminApi } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'
import { makeSong } from '@/test/player'

const song = makeSong(4)
const saved = { ...song, updated_at: '2026-10-28T00:00:00Z' }
const file = new File(['audio fixture'], 'sample.wav', { type: 'audio/wav' })
const onUploaded = vi.fn()
function select(selected = file) {
  fireEvent.change(screen.getByLabelText('File audio'), { target: { files: [selected] } })
}

describe('SongAudioUpload', () => {
  beforeEach(() => {
    vi.mocked(adminApi.uploadAudio).mockReset().mockResolvedValue(saved)
    onUploaded.mockReset()
    usePlayerStore.setState(usePlayerStore.getInitialState(), true)
  })

  it('uploads to the selected song and explicitly plays the returned song', async () => {
    render(<SongAudioUpload song={song} onUploaded={onUploaded} />)
    expect(screen.getByRole('button', { name: 'Unggah audio' })).toBeDisabled()
    select()
    fireEvent.click(screen.getByRole('button', { name: 'Unggah audio' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Putar hasil unggah' }))
    expect(adminApi.uploadAudio).toHaveBeenCalledWith(song.id, file, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(onUploaded).toHaveBeenCalledWith(saved)
    expect(usePlayerStore.getState().currentSong).toEqual(saved)
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })

  it.each([
    [new File([], 'empty.wav'), 'File audio kosong.'],
    [new File(['x'], 'song.exe'), 'Pilih file MP3 atau WAV.'],
    [new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'big.mp3'), 'Ukuran file melebihi 20 MiB.'],
  ])('rejects invalid file %s before sending', (invalid, message) => {
    render(<SongAudioUpload song={song} onUploaded={onUploaded} />)
    select(invalid)
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Unggah audio' })).toBeDisabled()
    expect(adminApi.uploadAudio).not.toHaveBeenCalled()
  })

  it('keeps the selected file for retry after a server validation error', async () => {
    vi.mocked(adminApi.uploadAudio).mockRejectedValueOnce(new Error('invalid audio content'))
    render(<SongAudioUpload song={song} onUploaded={onUploaded} />)
    select()
    fireEvent.click(screen.getByRole('button', { name: 'Unggah audio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid audio content')
    expect(onUploaded).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Coba unggah lagi' }))
    await screen.findByRole('button', { name: 'Putar hasil unggah' })
    expect(adminApi.uploadAudio).toHaveBeenCalledTimes(2)
  })

  it('reports transfer and processing separately and ignores late success after cancellation', async () => {
    let resolve!: (value: typeof saved) => void
    vi.mocked(adminApi.uploadAudio).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    render(<SongAudioUpload song={song} onUploaded={onUploaded} />)
    select()
    fireEvent.click(screen.getByRole('button', { name: 'Unggah audio' }))
    const options = vi.mocked(adminApi.uploadAudio).mock.calls[0]![2]!
    act(() => options.onProgress?.(42))
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '42')
    act(() => options.onProgress?.(100))
    expect(screen.getByText('File terkirim. Memvalidasi dan menyimpan…')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan unggahan' }))
    expect(options.signal?.aborted).toBe(true)
    expect(screen.getByRole('status')).toHaveTextContent('server mungkin sudah menyimpannya')
    await act(async () => resolve(saved))
    expect(onUploaded).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Putar hasil unggah' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Unggah audio' }))
    await screen.findByRole('button', { name: 'Putar hasil unggah' })
    expect(onUploaded).toHaveBeenCalledOnce()
  })

  it('aborts on unmount and prevents late updates to a different song', async () => {
    let resolve!: (value: typeof saved) => void
    vi.mocked(adminApi.uploadAudio).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const view = render(<SongAudioUpload song={song} onUploaded={onUploaded} />)
    select()
    fireEvent.click(screen.getByRole('button', { name: 'Unggah audio' }))
    const signal = vi.mocked(adminApi.uploadAudio).mock.calls[0]![2]!.signal!
    view.unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => resolve(saved))
    await waitFor(() => expect(onUploaded).not.toHaveBeenCalled())
  })
})
