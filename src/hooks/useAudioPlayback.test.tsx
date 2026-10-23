import { createRef, StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ streamUrl: (id: number) => `http://localhost:9000/api/stream/songs/${id}` }))

import { useAudioPlayback } from '@/hooks/useAudioPlayback'
import { usePlayerStore } from '@/store/playerStore'
import { makeSong } from '@/test/player'

let audio: HTMLAudioElement
let play: ReturnType<typeof vi.fn<() => Promise<void>>>
let pause: ReturnType<typeof vi.fn<() => void>>

function mountPlayer() {
  const ref = createRef<HTMLAudioElement>()
  ref.current = audio
  return renderHook(() => useAudioPlayback(ref))
}

describe('useAudioPlayback', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true)
    audio = document.createElement('audio')
    play = vi.fn().mockResolvedValue(undefined)
    pause = vi.fn()
    audio.play = play
    audio.pause = pause
    audio.load = vi.fn()
  })

  it('starts the stream endpoint even when file_url is different', async () => {
    mountPlayer()
    act(() => usePlayerStore.getState().play(makeSong()))
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1))
    expect(audio.src).toBe('http://localhost:9000/api/stream/songs/1')
    act(() => usePlayerStore.getState().play(makeSong(2)))
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(audio.src).toContain('/songs/2')
  })

  it('pauses and resumes without loading the source again', async () => {
    usePlayerStore.getState().play(makeSong())
    mountPlayer()
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1))
    const loads = vi.mocked(audio.load).mock.calls.length
    act(() => usePlayerStore.getState().togglePlay())
    expect(pause).toHaveBeenCalled()
    act(() => usePlayerStore.getState().togglePlay())
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(audio.load).toHaveBeenCalledTimes(loads)
  })

  it('ignores a rejected play promise belonging to the previous song', async () => {
    let rejectOld!: (reason: Error) => void
    play.mockReturnValueOnce(new Promise<void>((_resolve, reject) => { rejectOld = reject }))
    usePlayerStore.getState().play(makeSong())
    const { result } = mountPlayer()
    act(() => usePlayerStore.getState().play(makeSong(2)))
    await act(async () => rejectOld(new DOMException('interrupted', 'AbortError')))
    expect(result.current.error).toBeNull()
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })

  it('stops when play is rejected instead of simulating progress', async () => {
    play.mockRejectedValue(new DOMException('blocked', 'NotAllowedError'))
    usePlayerStore.getState().play(makeSong())
    const { result } = mountPlayer()
    await waitFor(() => expect(usePlayerStore.getState().isPlaying).toBe(false))
    expect(result.current.error).toContain('Browser menahan')
    expect(usePlayerStore.getState().progress).toBe(0)
  })

  it('uses media events for progress and detaches on unmount', async () => {
    usePlayerStore.getState().play(makeSong())
    const { unmount } = mountPlayer()
    await waitFor(() => expect(play).toHaveBeenCalled())
    act(() => audio.dispatchEvent(new Event('loadedmetadata')))
    act(() => { audio.currentTime = 12; audio.dispatchEvent(new Event('timeupdate')) })
    expect(usePlayerStore.getState().progress).toBe(12)
    unmount()
    audio.currentTime = 30
    audio.dispatchEvent(new Event('timeupdate'))
    expect(usePlayerStore.getState().progress).toBe(12)
    expect(usePlayerStore.getState().audioElement).toBeNull()
  })

  it('restores a paused position after metadata and clamps to the actual duration', () => {
    usePlayerStore.getState().restore(makeSong(), 90)
    Object.defineProperty(audio, 'duration', { configurable: true, value: 60 })
    const { result } = mountPlayer()
    expect(play).not.toHaveBeenCalled()
    act(() => audio.dispatchEvent(new Event('timeupdate')))
    expect(usePlayerStore.getState().progress).toBe(90)
    act(() => audio.dispatchEvent(new Event('loadedmetadata')))
    expect(audio.currentTime).toBe(60)
    expect(usePlayerStore.getState().progress).toBe(60)
    expect(result.current.duration).toBe(60)
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  it('applies a seek requested before metadata arrives', () => {
    usePlayerStore.getState().restore(makeSong(), 12)
    mountPlayer()
    act(() => usePlayerStore.getState().seek(35))
    act(() => audio.dispatchEvent(new Event('loadedmetadata')))
    expect(audio.currentTime).toBe(35)
  })

  it('restarts the same song and advances on the actual ended event', async () => {
    const first = makeSong()
    const second = makeSong(2)
    usePlayerStore.getState().play(first, [first, second])
    mountPlayer()
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1))
    act(() => { audio.dispatchEvent(new Event('loadedmetadata')); audio.currentTime = 20 })
    act(() => usePlayerStore.getState().play(first, [first, second]))
    act(() => audio.dispatchEvent(new Event('loadedmetadata')))
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(audio.currentTime).toBe(0)
    act(() => audio.dispatchEvent(new Event('ended')))
    await waitFor(() => expect(play).toHaveBeenCalledTimes(3))
    expect(audio.src).toContain('/songs/2')
  })

  it('exposes media failure and retries from the last position', async () => {
    usePlayerStore.getState().play(makeSong())
    const { result } = mountPlayer()
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1))
    act(() => {
      audio.dispatchEvent(new Event('loadedmetadata'))
      audio.currentTime = 17
      audio.dispatchEvent(new Event('timeupdate'))
      audio.dispatchEvent(new Event('error'))
    })
    expect(result.current.error).toContain('tidak bisa dimuat')
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(result.current.loading).toBe(false)
    act(() => result.current.retry())
    act(() => audio.dispatchEvent(new Event('loadedmetadata')))
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(audio.currentTime).toBe(17)
    expect(result.current.error).toBeNull()
  })

  it('survives StrictMode cleanup and discards interrupted playback', async () => {
    play.mockRejectedValueOnce(new DOMException('interrupted', 'AbortError'))
    usePlayerStore.getState().play(makeSong())
    const ref = createRef<HTMLAudioElement>()
    ref.current = audio
    const { result } = renderHook(() => useAudioPlayback(ref), { wrapper: StrictMode })
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(result.current.error).toBeNull()
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })

  it('ignores an old rejection after pause and clears audio on stop', async () => {
    let reject!: (reason: Error) => void
    play.mockReturnValueOnce(new Promise<void>((_resolve, fail) => { reject = fail }))
    usePlayerStore.getState().play(makeSong())
    const { result } = mountPlayer()
    act(() => usePlayerStore.getState().togglePlay())
    await act(async () => reject(new DOMException('interrupted', 'AbortError')))
    expect(result.current.error).toBeNull()
    act(() => usePlayerStore.getState().stop())
    expect(audio.hasAttribute('src')).toBe(false)
    expect(result.current.duration).toBe(0)
    expect(result.current.loading).toBe(false)
  })
})
