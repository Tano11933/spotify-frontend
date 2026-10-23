import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ streamUrl: (id: number) => `http://localhost/api/stream/songs/${id}` }))

import { NowPlayingBar } from '@/components/layout/NowPlayingBar'
import { usePlayerStore } from '@/store/playerStore'
import { makeSong } from '@/test/player'

function mountBar() {
  return render(<MemoryRouter><NowPlayingBar /></MemoryRouter>)
}

describe('NowPlayingBar', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true)
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })

  it('shows the empty state and disables playback controls', () => {
    mountBar()
    expect(screen.getByText('Belum ada lagu diputar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Putar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lagu berikutnya' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Antrean' })).toHaveAttribute('href', '/queue')
  })

  it('announces loading, exposes failure and retries using the visible control', async () => {
    let resolvePlay!: () => void
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(new Promise<void>((resolve) => { resolvePlay = resolve }))
    usePlayerStore.getState().play(makeSong())
    const { container } = mountBar()
    expect(screen.getByRole('status')).toHaveTextContent('Memuat audio')
    const audio = container.querySelector('audio')!
    fireEvent.error(audio)
    expect(screen.getByRole('status')).toHaveTextContent('Audio tidak bisa dimuat')
    expect(screen.getByRole('button', { name: 'Putar' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2))
    await act(async () => resolvePlay())
    expect(screen.queryByText(/tidak bisa dimuat/)).not.toBeInTheDocument()
  })

  it('connects previous, play/pause, next, seek and volume to real audio', async () => {
    const first = makeSong()
    const second = makeSong(2)
    usePlayerStore.getState().play(first, [first, second])
    const { container } = mountBar()
    const audio = container.querySelector('audio')!
    Object.defineProperties(audio, { readyState: { value: 1 }, duration: { value: 100 } })
    fireEvent.loadedMetadata(audio)
    await waitFor(() => expect(screen.queryByText('Memuat audio…')).not.toBeInTheDocument())
    fireEvent.change(screen.getByRole('slider', { name: 'Posisi pemutaran' }), { target: { value: '20' } })
    expect(audio.currentTime).toBe(20)
    fireEvent.click(screen.getByRole('button', { name: 'Lagu sebelumnya' }))
    expect(audio.currentTime).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Jeda' }))
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Putar' }))
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2))
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '25' } })
    expect(audio.volume).toBe(0.25)
    fireEvent.click(screen.getByRole('button', { name: 'Lagu berikutnya' }))
    await waitFor(() => expect(audio.src).toContain('/songs/2'))
  })
})
