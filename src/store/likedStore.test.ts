import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  // authStore memanggil configureAuthBridge saat module dimuat, dan store ini
  // mengimpornya; mock harus menyediakan semua nama yang diimpor.
  authApi: {},
  configureAuthBridge: vi.fn(),
  libraryApi: {
    tracksContain: vi.fn(),
    saveTrack: vi.fn(),
    removeTrack: vi.fn(),
  },
  getApiErrorMessage: vi.fn(() => 'gagal'),
}))

import { libraryApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useLikedStore } from '@/store/likedStore'
import { useToastStore } from '@/store/toastStore'

const tracksContainMock = vi.mocked(libraryApi.tracksContain)
const saveTrackMock = vi.mocked(libraryApi.saveTrack)
const removeTrackMock = vi.mocked(libraryApi.removeTrack)

describe('likedStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAuthStore.setState({ status: 'authenticated' })
    useLikedStore.setState({ liked: {} })
    useToastStore.setState({ toasts: [] })
    tracksContainMock.mockReset()
    saveTrackMock.mockReset()
    removeTrackMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('menggabungkan id yang belum diketahui menjadi satu request', async () => {
    tracksContainMock.mockResolvedValue({ '1': true, '2': false, '3': false })

    useLikedStore.getState().ensureLoaded([1, 2])
    useLikedStore.getState().ensureLoaded([2, 3])
    await vi.advanceTimersByTimeAsync(50)

    expect(tracksContainMock).toHaveBeenCalledTimes(1)
    expect(tracksContainMock).toHaveBeenCalledWith([1, 2, 3])
    expect(useLikedStore.getState().liked).toEqual({ 1: true, 2: false, 3: false })
  })

  it('tidak memanggil contains untuk id yang statusnya sudah diketahui', async () => {
    useLikedStore.setState({ liked: { 1: true } })

    useLikedStore.getState().ensureLoaded([1])
    await vi.advanceTimersByTimeAsync(50)

    expect(tracksContainMock).not.toHaveBeenCalled()
  })

  it('toggle bersifat optimistic dan memanggil saveTrack', async () => {
    saveTrackMock.mockResolvedValue({ message: 'ok' })

    await useLikedStore.getState().toggle(9)

    expect(saveTrackMock).toHaveBeenCalledWith(9)
    expect(useLikedStore.getState().liked[9]).toBe(true)
  })

  it('mengembalikan status dan menampilkan toast saat request gagal', async () => {
    removeTrackMock.mockRejectedValue(new Error('jaringan putus'))
    useLikedStore.setState({ liked: { 9: true } })

    await useLikedStore.getState().toggle(9)

    expect(removeTrackMock).toHaveBeenCalledWith(9)
    expect(useLikedStore.getState().liked[9]).toBe(true)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0]?.variant).toBe('error')
  })

  it('tidak melakukan apa-apa saat user belum login', async () => {
    useAuthStore.setState({ status: 'unauthenticated' })

    await useLikedStore.getState().toggle(9)

    expect(saveTrackMock).not.toHaveBeenCalled()
    expect(useLikedStore.getState().liked[9]).toBeUndefined()
  })
})
