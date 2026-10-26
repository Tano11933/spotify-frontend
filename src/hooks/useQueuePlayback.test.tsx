import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  configureAuthBridge: vi.fn(), authApi: {}, getApiErrorMessage: (cause: Error) => cause.message,
  playerApi: { reserveQueueEntry: vi.fn(), confirmQueueEntry: vi.fn(), releaseQueueEntry: vi.fn(), play: vi.fn() },
}))

import { playerApi } from '@/lib/api'
import { useQueuePlayback } from '@/hooks/useQueuePlayback'
import { usePlayerStore } from '@/store/playerStore'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { makeSong } from '@/test/player'
import type { QueueReservation } from '@/types'

const reservation = (id = 'lease-1', entryId = 10): QueueReservation => ({ id, entry_id: entryId, expires_at: new Date(Date.now() + 60_000).toISOString(), song: makeSong(3) })
async function advance(entryId?: number) { await act(async () => usePlayerStore.getState().advanceHandler!(entryId)) }
function started() { act(() => usePlayerStore.getState().markAudioStarted('first')) }

describe('useQueuePlayback', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true)
    useAuthStore.setState({ status: 'authenticated', user: { id: 'first', name: 'First', email: '', role: 'user', created_at: '', updated_at: '' } })
    useToastStore.setState({ toasts: [] })
    vi.mocked(playerApi.reserveQueueEntry).mockReset().mockResolvedValue(reservation())
    vi.mocked(playerApi.confirmQueueEntry).mockReset().mockResolvedValue({ message: 'confirmed' })
    vi.mocked(playerApi.releaseQueueEntry).mockReset().mockResolvedValue({ message: 'released' })
    vi.mocked(playerApi.play).mockReset().mockResolvedValue({ song: makeSong(), position_seconds: 0 })
  })
  afterEach(() => vi.useRealTimers())

  it('prioritizes the account queue, then resumes the original album context', async () => {
    const first = makeSong()
    const second = makeSong(2)
    usePlayerStore.getState().play(first, [first, second])
    renderHook(() => useQueuePlayback())
    await advance()
    expect(usePlayerStore.getState().currentSong?.id).toBe(3)
    expect(usePlayerStore.getState().queue).toEqual([first, second])
    expect(playerApi.confirmQueueEntry).not.toHaveBeenCalled()
    started()
    await waitFor(() => expect(playerApi.play).toHaveBeenCalledWith(3))
    vi.mocked(playerApi.reserveQueueEntry).mockResolvedValueOnce(null)
    await advance()
    expect(usePlayerStore.getState().currentSong?.id).toBe(2)
  })

  it('only records history after native playback and does not count pause/resume twice', async () => {
    renderHook(() => useQueuePlayback())
    act(() => usePlayerStore.getState().play(makeSong()))
    expect(playerApi.play).not.toHaveBeenCalled()
    started()
    await waitFor(() => expect(playerApi.play).toHaveBeenCalledTimes(1))
    act(() => usePlayerStore.getState().togglePlay())
    act(() => usePlayerStore.getState().togglePlay())
    started()
    expect(playerApi.play).toHaveBeenCalledTimes(1)
    act(() => usePlayerStore.getState().play(makeSong()))
    started()
    await waitFor(() => expect(playerApi.play).toHaveBeenCalledTimes(2))
  })

  it('does not confirm or record failed audio; the entry can be reserved again', async () => {
    renderHook(() => useQueuePlayback())
    await advance(10)
    act(() => usePlayerStore.getState().markAudioFailed())
    await waitFor(() => expect(playerApi.releaseQueueEntry).toHaveBeenCalledWith('lease-1'))
    expect(playerApi.confirmQueueEntry).not.toHaveBeenCalled()
    expect(playerApi.play).not.toHaveBeenCalled()
    vi.mocked(playerApi.reserveQueueEntry).mockResolvedValueOnce(reservation('lease-2'))
    act(() => usePlayerStore.getState().togglePlay())
    await waitFor(() => expect(usePlayerStore.getState().queueReservation?.id).toBe('lease-2'))
    expect(playerApi.reserveQueueEntry).toHaveBeenLastCalledWith(10)
  })

  it('waits for consumption confirmation before recording a queued play', async () => {
    let resolve!: (value: { message: string }) => void
    vi.mocked(playerApi.confirmQueueEntry).mockReturnValue(new Promise((done) => { resolve = done }))
    renderHook(() => useQueuePlayback())
    await advance()
    started()
    expect(playerApi.confirmQueueEntry).toHaveBeenCalledWith('lease-1')
    expect(playerApi.play).not.toHaveBeenCalled()
    await act(async () => resolve({ message: 'confirmed' }))
    await waitFor(() => expect(playerApi.play).toHaveBeenCalledTimes(1))
    expect(usePlayerStore.getState().queueRevision).toBe(1)
  })

  it('stops playback and keeps history empty if consumption is rejected', async () => {
    vi.mocked(playerApi.confirmQueueEntry).mockRejectedValue(new Error('reservation expired'))
    renderHook(() => useQueuePlayback())
    await advance()
    started()
    await waitFor(() => expect(usePlayerStore.getState().isPlaying).toBe(false))
    expect(playerApi.play).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().queueReservation?.status).toBe('released')
  })

  it('does not overwrite a manual selection when a reservation arrives late', async () => {
    let resolve!: (value: QueueReservation) => void
    vi.mocked(playerApi.reserveQueueEntry).mockReturnValue(new Promise((done) => { resolve = done }))
    renderHook(() => useQueuePlayback())
    let request!: Promise<void>
    act(() => { request = usePlayerStore.getState().advanceHandler!() })
    act(() => usePlayerStore.getState().play(makeSong(9)))
    await act(async () => { resolve(reservation()); await request })
    expect(usePlayerStore.getState().currentSong?.id).toBe(9)
    expect(playerApi.releaseQueueEntry).toHaveBeenCalledWith('lease-1')
  })

  it('does not duplicate reservation requests on rapid next clicks', async () => {
    renderHook(() => useQueuePlayback())
    await act(async () => {
      const next = usePlayerStore.getState().advanceHandler!
      await Promise.all([next(), next()])
    })
    expect(playerApi.reserveQueueEntry).toHaveBeenCalledTimes(1)
  })

  it('releases an unstarted entry when the user selects another song', async () => {
    renderHook(() => useQueuePlayback())
    await advance()
    act(() => usePlayerStore.getState().play(makeSong(9)))
    expect(playerApi.releaseQueueEntry).toHaveBeenCalledWith('lease-1')
    expect(playerApi.confirmQueueEntry).not.toHaveBeenCalled()
  })

  it('expires an unstarted lease and permits an explicit retry', async () => {
    vi.useFakeTimers()
    renderHook(() => useQueuePlayback())
    await advance()
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(usePlayerStore.getState().queueReservation?.status).toBe('released')
    expect(playerApi.play).not.toHaveBeenCalled()
  })

  it('does not record the previous account playback after changing accounts', async () => {
    renderHook(() => useQueuePlayback())
    act(() => usePlayerStore.getState().play(makeSong()))
    act(() => {
      usePlayerStore.getState().markAudioStarted('first')
      useAuthStore.setState({ user: { id: 'second', name: 'Second', email: '', role: 'user', created_at: '', updated_at: '' } })
    })
    expect(playerApi.play).not.toHaveBeenCalled()
  })

  it('keeps reservation errors visible instead of silently skipping the queue', async () => {
    usePlayerStore.getState().play(makeSong())
    vi.mocked(playerApi.reserveQueueEntry).mockRejectedValue(new Error('queue unavailable'))
    renderHook(() => useQueuePlayback())
    await advance()
    expect(usePlayerStore.getState().currentSong?.id).toBe(1)
    expect(useToastStore.getState().toasts[0]?.title).toBe('Antrean tidak bisa diputar')
  })

  it('uses the local context for guests and remains safe under StrictMode', async () => {
    useAuthStore.setState({ status: 'unauthenticated', user: null })
    const first = makeSong()
    const second = makeSong(2)
    usePlayerStore.getState().play(first, [first, second])
    renderHook(() => useQueuePlayback(), { wrapper: StrictMode })
    await advance()
    expect(usePlayerStore.getState().currentSong).toBe(second)
    expect(playerApi.reserveQueueEntry).not.toHaveBeenCalled()
  })

  it('does not count the same playback again when the layout remounts', async () => {
    const first = renderHook(() => useQueuePlayback())
    act(() => usePlayerStore.getState().play(makeSong()))
    started()
    await waitFor(() => expect(playerApi.play).toHaveBeenCalledTimes(1))
    first.unmount()
    renderHook(() => useQueuePlayback(), { wrapper: StrictMode })
    started()
    expect(playerApi.play).toHaveBeenCalledTimes(1)
  })
})
