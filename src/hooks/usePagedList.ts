import { useCallback, useEffect, useRef, useState } from 'react'

import { getApiErrorMessage } from '@/lib/api'
import type { Page } from '@/types'

/** Jumlah item per halaman untuk daftar katalog. */
export const PAGE_SIZE = 24

type PrimitiveDeps = readonly (string | number | boolean | null | undefined)[]

interface PagedListState<T> {
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
  const [reloadToken, setReloadToken] = useState(0)

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

      setError(null)
      if (append) setIsLoadingMore(true)
      else setIsLoading(true)

      fetchRef
        .current({ limit: pageSize, offset })
        .then((page) => {
          if (requestRef.current !== requestId) return
          setItems((current) => (append ? [...current, ...page.items] : page.items))
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
        })
    },
    [pageSize],
  )

  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    setItems([])
    setTotal(0)
    load(0, false)
  }, [depsKey, reloadToken, load])

  const hasMore = items.length < total

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore) return
    if (items.length >= total) return
    load(items.length, true)
  }, [isLoading, isLoadingMore, items.length, total, load])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, reload }
}
