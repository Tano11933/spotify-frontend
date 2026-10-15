import { useCallback, useEffect, useRef, useState } from 'react'

import { getApiErrorMessage } from '@/lib/api'
import type { Page } from '@/types'

/** Jumlah item per halaman untuk daftar berbasis cursor. */
export const CURSOR_PAGE_SIZE = 20

type PrimitiveDeps = readonly (string | number | boolean | null | undefined)[]

interface CursorListState<T> {
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
 * Hook daftar dengan "muat lagi" berbasis cursor (keyset).
 *
 * Bedanya dengan `usePagedList` (offset): posisi halaman berikutnya datang
 * dari server lewat `next_cursor`, bukan dihitung dari jumlah item. Karena
 * itu halaman berikutnya tidak pernah bergeser walau ada data baru yang
 * disisipkan di depan, dan biaya query-nya tidak tumbuh mengikuti kedalaman.
 * Dipakai untuk feed dan riwayat putar, yang datanya terus bertambah.
 *
 * Sama seperti `usePagedList`: item diakumulasi lintas halaman, dan setiap
 * pemuatan diberi nomor urut supaya hasil lama tidak menimpa hasil baru.
 */
export function useCursorList<T>(
  fetchPage: (params: { limit: number; cursor?: string }) => Promise<Page<T>>,
  deps: PrimitiveDeps = [],
  pageSize: number = CURSOR_PAGE_SIZE,
): CursorListState<T> {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // fetchPage disimpan di ref dengan alasan yang sama seperti usePagedList:
  // pemanggil menulis fungsi inline yang identitasnya baru setiap render.
  const fetchRef = useRef(fetchPage)
  useEffect(() => {
    fetchRef.current = fetchPage
  })

  const requestRef = useRef(0)

  const load = useCallback(
    (cursor: string | undefined, append: boolean) => {
      const requestId = requestRef.current + 1
      requestRef.current = requestId

      setError(null)
      if (append) setIsLoadingMore(true)
      else setIsLoading(true)

      fetchRef
        .current({ limit: pageSize, cursor })
        .then((page) => {
          if (requestRef.current !== requestId) return
          setItems((current) => (append ? [...current, ...page.items] : page.items))
          setTotal(page.total)
          setNextCursor(page.next_cursor)
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
    setNextCursor(undefined)
    load(undefined, false)
  }, [depsKey, reloadToken, load])

  const hasMore = Boolean(nextCursor)

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !nextCursor) return
    load(nextCursor, true)
  }, [isLoading, isLoadingMore, nextCursor, load])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, reload }
}
