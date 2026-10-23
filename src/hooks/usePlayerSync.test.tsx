import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  authApi: {}, configureAuthBridge: vi.fn(),
  playerApi: { getState: vi.fn(), updateState: vi.fn().mockResolvedValue({}) },
}))

import { playerApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { usePlayerStore } from '@/store/playerStore'
import { usePlayerSync } from '@/hooks/usePlayerSync'
import { makeSong } from '@/test/player'
import type { User } from '@/types'

const user = (id: string): User => ({ id, name: id, email: `${id}@example.invalid`, role: 'user', created_at: '', updated_at: '' })

describe('usePlayerSync', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true)
    useAuthStore.setState({ status: 'authenticated', user: user('first') })
    vi.mocked(playerApi.getState).mockReset()
    vi.mocked(playerApi.updateState).mockClear()
  })

  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('restores the saved song paused without replacing a user selection', async () => {
    vi.mocked(playerApi.getState).mockResolvedValue({ song: makeSong(), position_seconds: 42 })
    renderHook(() => usePlayerSync())
    await waitFor(() => expect(usePlayerStore.getState().progress).toBe(42))
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  it('does not overwrite a song selected while restoration was pending', async () => {
    let resolve!: (value: { song: ReturnType<typeof makeSong>; position_seconds: number }) => void
    vi.mocked(playerApi.getState).mockReturnValue(new Promise((done) => { resolve = done }))
    renderHook(() => usePlayerSync())
    act(() => usePlayerStore.getState().play(makeSong(2)))
    await act(async () => resolve({ song: makeSong(), position_seconds: 42 }))
    expect(usePlayerStore.getState().currentSong?.id).toBe(2)
  })

  it('discards an old account response and restores the next account', async () => {
    let resolveOld!: (value: { song: ReturnType<typeof makeSong>; position_seconds: number }) => void
    vi.mocked(playerApi.getState)
      .mockReturnValueOnce(new Promise((done) => { resolveOld = done }))
      .mockResolvedValueOnce({ song: makeSong(2), position_seconds: 24 })
    renderHook(() => usePlayerSync())
    act(() => useAuthStore.setState({ status: 'unauthenticated', user: null }))
    await act(async () => resolveOld({ song: makeSong(), position_seconds: 42 }))
    expect(usePlayerStore.getState().currentSong).toBeNull()
    act(() => useAuthStore.setState({ status: 'authenticated', user: user('second') }))
    await waitFor(() => expect(usePlayerStore.getState().currentSong?.id).toBe(2))
    expect(usePlayerStore.getState().progress).toBe(24)
  })

  it('stops the old account player on a direct account change', async () => {
    vi.mocked(playerApi.getState).mockResolvedValue({ song: null, position_seconds: 0 })
    renderHook(() => usePlayerSync())
    act(() => usePlayerStore.getState().play(makeSong()))
    act(() => useAuthStore.setState({ user: user('second') }))
    await waitFor(() => expect(usePlayerStore.getState().currentSong).toBeNull())
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  it('ignores a restoration response after unmount', async () => {
    let resolve!: (value: { song: ReturnType<typeof makeSong>; position_seconds: number }) => void
    vi.mocked(playerApi.getState).mockReturnValue(new Promise((done) => { resolve = done }))
    const { unmount } = renderHook(() => usePlayerSync())
    unmount()
    await act(async () => resolve({ song: makeSong(), position_seconds: 42 }))
    expect(usePlayerStore.getState().currentSong).toBeNull()
  })

  it('saves position periodically and on pause, then stops its timer', async () => {
    vi.useFakeTimers()
    vi.mocked(playerApi.getState).mockResolvedValue({ song: null, position_seconds: 0 })
    const { unmount } = renderHook(() => usePlayerSync())
    await act(async () => {})
    act(() => {
      usePlayerStore.getState().play(makeSong())
      usePlayerStore.setState({ progress: 20.8 })
    })
    await act(async () => vi.advanceTimersByTimeAsync(30_000))
    expect(playerApi.updateState).toHaveBeenLastCalledWith({ song_id: 1, position_seconds: 20 })
    act(() => usePlayerStore.getState().togglePlay())
    expect(playerApi.updateState).toHaveBeenCalledTimes(2)
    unmount()
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(playerApi.updateState).toHaveBeenCalledTimes(2)
  })

  it('keeps the latest position alive when the tab is closed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ accessToken: 'fixture-access-token' })
    vi.mocked(playerApi.getState).mockResolvedValue({ song: null, position_seconds: 0 })
    renderHook(() => usePlayerSync())
    await act(async () => {})
    act(() => {
      usePlayerStore.getState().play(makeSong())
      usePlayerStore.setState({ progress: 8.9 })
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/me/player'), expect.objectContaining({
      keepalive: true, body: JSON.stringify({ song_id: 1, position_seconds: 8 }),
    }))
  })

  it('does not save the previous account song during an account change', async () => {
    vi.mocked(playerApi.getState).mockResolvedValue({ song: null, position_seconds: 0 })
    renderHook(() => usePlayerSync())
    await act(async () => {})
    act(() => usePlayerStore.getState().play(makeSong()))
    act(() => {
      usePlayerStore.setState({ isPlaying: false })
      useAuthStore.setState({ user: user('second') })
    })
    expect(playerApi.updateState).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().currentSong).toBeNull()
  })
})
