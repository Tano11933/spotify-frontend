import { useCallback, useEffect, useRef, useState } from 'react'

import { getApiErrorMessage } from '@/lib/api'
import type { Page } from '@/types'

/** Jumlah item per halaman untuk daftar katalog. */
export const PAGE_SIZE = 24

type PrimitiveDeps = readonly (string | number | boolean | null | undefined)[]

export interface PagedListState<T> {
  items: T[]
  total: number
  /** Pemuatan halaman pertama (tampilkan LoadingState). */
  isLoading: boolean
  /** Pemuatan halaman berikutnya (spinner di tombol "Muat lagi"). */
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  reload: () => void
  isRefreshing: boolean
  refreshError: string | null
  /** Re-fetch the loaded range after a mutation changes offsets. */
  refresh: () => Promise<void>
}

/**
 * Hook daftar dengan tombol "muat lagi" berbasis offset.
 *
 * `fetchPage` menerima `{limit, offset}` dan mengembalikan envelope `Page<T>`
 * backend. `deps` berisi nilai primitif yang mengubah sumber data (mis. tab
 * aktif): saat berubah, daftar direset dan halaman pertama dimuat ulang.
 *
 * Dua hal yang membedakannya dari `useAsync`:
 *
 *  1. Item DIAKUMULASI lintas halaman, bukan diganti, sehingga daftar yang
 *     sudah tampil tidak berkedip saat "muat lagi".
 *  2. Setiap pemuatan diberi nomor urut; response yang nomornya bukan yang
 *     terakhir dibuang. Tanpa itu, hasil halaman lama bisa menimpa hasil baru
 *     saat user berpindah tab atau menekan "muat lagi" beruntun.
 */
export function usePagedList<T>(
  fetchPage: (params: { limit: number; offset: number }) => Promise<Page<T>>,
  deps: PrimitiveDeps = [],
  pageSize: number = PAGE_SIZE,
): PagedListState<T> {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const loadedCountRef = useRef(0)
  const pendingRef = useRef(false)

  // fetchPage disimpan di ref dengan alasan yang sama seperti useAsync:
  // pemanggil menulis fungsi inline yang identitasnya baru setiap render, dan
  // itu tidak boleh memicu pemuatan ulang.
  const fetchRef = useRef(fetchPage)
  useEffect(() => {
    fetchRef.current = fetchPage
  })

  const requestRef = useRef(0)

  const load = useCallback(
    (offset: number, append: boolean) => {
      const requestId = requestRef.current + 1
      requestRef.current = requestId
      pendingRef.current = true

      setError(null)
      setRefreshError(null)
      setIsRefreshing(false)
      if (append) setIsLoadingMore(true)
      else setIsLoading(true)

      fetchRef
        .current({ limit: pageSize, offset })
        .then((page) => {
          if (requestRef.current !== requestId) return
          setItems((current) => (append ? [...current, ...page.items] : page.items))
          loadedCountRef.current = (append ? loadedCountRef.current : 0) + page.items.length
          setTotal(page.total)
        })
        .catch((loadError: unknown) => {
          if (requestRef.current !== requestId) return
          setError(getApiErrorMessage(loadError))
        })
        .finally(() => {
          if (requestRef.current !== requestId) return
          setIsLoading(false)
          setIsLoadingMore(false)
          pendingRef.current = false
        })
    },
    [pageSize],
  )

  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    setItems([])
    setTotal(0)
    loadedCountRef.current = 0
    load(0, false)
    return () => { requestRef.current += 1; pendingRef.current = false }
  }, [depsKey, load])

  const hasMore = items.length < total

  const loadMore = useCallback(() => {
    if (pendingRef.current || isLoading || isLoadingMore || refreshError) return
    if (items.length >= total) return
    load(items.length, true)
  }, [isLoading, isLoadingMore, items.length, total, load, refreshError])

  const reload = useCallback(() => {
    setItems([])
    setTotal(0)
    loadedCountRef.current = 0
    load(0, false)
  }, [load])

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current
    const target = Math.max(pageSize, loadedCountRef.current)
    pendingRef.current = true
    setIsRefreshing(true)
    setIsLoadingMore(false)
    setRefreshError(null)
    setError(null)
    try {
      const refreshed: T[] = []
      let nextTotal = 0
      do {
        const page = await fetchRef.current({ limit: pageSize, offset: refreshed.length })
        if (requestRef.current !== requestId) return
        refreshed.push(...page.items)
        nextTotal = page.total
        if (page.items.length === 0) break
      } while (refreshed.length < target && refreshed.length < nextTotal)
      setItems(refreshed)
      setTotal(nextTotal)
      loadedCountRef.current = refreshed.length
    } catch (cause) {
      if (requestRef.current === requestId) setRefreshError(getApiErrorMessage(cause))
    } finally {
      if (requestRef.current === requestId) {
        pendingRef.current = false
        setIsRefreshing(false)
        setIsLoading(false)
      }
    }
  }, [pageSize])

  return { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, reload, refresh, isRefreshing, refreshError }
}
