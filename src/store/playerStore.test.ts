import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlayerStore } from '@/store/playerStore'
import { makeSong } from '@/test/player'

describe('playerStore', () => {
  beforeEach(() => usePlayerStore.setState(usePlayerStore.getInitialState(), true))

  it('seeks the actual audio to zero when previous restarts the current song', () => {
    const audio = document.createElement('audio')
    Object.defineProperties(audio, { readyState: { value: 1 }, duration: { value: 120 } })
    usePlayerStore.getState().play(makeSong())
    usePlayerStore.getState().attachAudio(audio)
    usePlayerStore.getState().seek(10)
    usePlayerStore.getState().previous()
    expect(audio.currentTime).toBe(0)
    expect(usePlayerStore.getState().progress).toBe(0)
    expect(usePlayerStore.getState().currentSong?.id).toBe(1)
  })

  it('moves backwards and wraps through the local context', () => {
    const first = makeSong()
    const second = makeSong(2)
    usePlayerStore.getState().play(first, [first, second])
    usePlayerStore.getState().previous()
    expect(usePlayerStore.getState().currentSong).toBe(second)
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState().currentSong).toBe(first)
  })

  it('marks selecting the same object and single-song looping as new playback', () => {
    const song = makeSong()
    usePlayerStore.getState().play(song)
    const version = usePlayerStore.getState().playbackVersion
    usePlayerStore.getState().play(song)
    expect(usePlayerStore.getState().playbackVersion).toBe(version + 1)
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState().playbackVersion).toBe(version + 2)
  })

  it('clamps seek to the real audio duration and volume to its valid range', () => {
    const audio = document.createElement('audio')
    Object.defineProperties(audio, { readyState: { value: 1 }, duration: { value: 45 } })
    usePlayerStore.getState().play(makeSong())
    usePlayerStore.getState().attachAudio(audio)
    usePlayerStore.getState().seek(100)
    expect(audio.currentTime).toBe(45)
    usePlayerStore.getState().setVolume(2)
    expect(audio.volume).toBe(1)
    usePlayerStore.getState().seek(-5)
    expect(audio.currentTime).toBe(0)
  })

  it('stops and clears the local context', () => {
    const audio = document.createElement('audio')
    audio.pause = vi.fn()
    usePlayerStore.getState().attachAudio(audio)
    usePlayerStore.getState().play(makeSong())
    usePlayerStore.getState().stop()
    expect(audio.pause).toHaveBeenCalled()
    expect(usePlayerStore.getState()).toMatchObject({ currentSong: null, queue: [], progress: 0, isPlaying: false })
  })
})
