import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePagedList } from '@/hooks/usePagedList'
import type { Page } from '@/types'

function makePage(items: string[], total: number, offset = 0, limit = 2): Page<string> {
  return { items, total, limit, offset }
}

type FetchPage = (params: { limit: number; offset: number }) => Promise<Page<string>>

describe('usePagedList', () => {
  it('memuat halaman pertama', async () => {
    const fetchPage = vi.fn<FetchPage>().mockResolvedValue(makePage(['a', 'b'], 4))
    const { result } = renderHook(() => usePagedList(fetchPage, [], 2))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchPage).toHaveBeenCalledWith({ limit: 2, offset: 0 })
    expect(result.current.items).toEqual(['a', 'b'])
    expect(result.current.total).toBe(4)
    expect(result.current.hasMore).toBe(true)
  })

  it('loadMore menambahkan halaman berikutnya dengan offset yang benar', async () => {
    const fetchPage = vi
      .fn<FetchPage>()
      .mockResolvedValueOnce(makePage(['a', 'b'], 4))
      .mockResolvedValueOnce(makePage(['c', 'd'], 4, 2))

    const { result } = renderHook(() => usePagedList(fetchPage, [], 2))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false))

    expect(fetchPage).toHaveBeenLastCalledWith({ limit: 2, offset: 2 })
    expect(result.current.items).toEqual(['a', 'b', 'c', 'd'])
    expect(result.current.hasMore).toBe(false)
  })

  it('loadMore tidak memanggil fetch saat semua item sudah tampil', async () => {
    const fetchPage = vi.fn<FetchPage>().mockResolvedValue(makePage(['a'], 1))
    const { result } = renderHook(() => usePagedList(fetchPage, [], 2))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.loadMore())

    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('mengekspos error halaman pertama, dan reload memuat ulang', async () => {
    const fetchPage = vi
      .fn<FetchPage>()
      .mockRejectedValueOnce(new Error('jaringan putus'))
      .mockResolvedValue(makePage(['a'], 1))

    const { result } = renderHook(() => usePagedList(fetchPage, [], 2))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('jaringan putus')
    expect(result.current.items).toEqual([])

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.items).toEqual(['a']))
    expect(result.current.error).toBeNull()
  })

  it('membuang hasil lama saat deps berubah', async () => {
    // Panggilan pertama sengaja menggantung; hasilnya baru tiba setelah deps
    // berganti, dan saat itu hasilnya sudah tidak relevan.
    let resolveSlow: (value: Page<string>) => void = () => {}
    const slow = new Promise<Page<string>>((resolve) => {
      resolveSlow = resolve
    })

    const fetchPage = vi.fn<FetchPage>((params) => {
      if (fetchPage.mock.calls.length === 1) return slow
      return Promise.resolve(makePage(['baru'], 1, params.offset))
    })

    const { result, rerender } = renderHook(
      ({ dep }: { dep: string }) => usePagedList(fetchPage, [dep], 2),
      { initialProps: { dep: 'lama' } },
    )

    rerender({ dep: 'baru' })
    await waitFor(() => expect(result.current.items).toEqual(['baru']))

    await act(async () => {
      resolveSlow(makePage(['lama'], 1))
      await slow
    })

    expect(result.current.items).toEqual(['baru'])
  })
})
