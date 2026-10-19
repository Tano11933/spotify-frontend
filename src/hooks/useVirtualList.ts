import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tinggi satu baris SongRow dalam piksel.
 *
 * Angka ini HARUS sama dengan tinggi render SongRow (py-2 = 16px + judul
 * text-base 24px + artist text-sm 20px). Window menghitung posisi baris dari
 * konstanta ini, jadi kalau SongRow berubah tinggi, ubah juga di sini;
 * VirtualSongList memasang tinggi ini pada wrapper supaya barisnya konsisten.
 */
export const SONG_ROW_HEIGHT = 60

/** Rentang baris yang perlu dirender untuk posisi gulir saat ini. */
export interface VirtualRange {
  /** Indeks pertama (inklusif). */
  start: number
  /** Indeks terakhir (eksklusif). */
  end: number
  /** Jarak dari atas daftar ke baris pertama yang dirender. */
  offsetY: number
  /** Tinggi total seluruh baris, dipakai sebagai tinggi spacer. */
  totalHeight: number
}

/**
 * computeVirtualRange menghitung baris mana yang perlu ada di DOM.
 *
 * Fungsi murni supaya bisa diuji tanpa DOM (jsdom tidak punya layout, jadi
 * menguji hook-nya langsung tidak memberi banyak). `overscan` menambah baris
 * di atas/bawah viewport supaya gulir cepat tidak menampilkan area kosong.
 */
export function computeVirtualRange(
  scrollTop: number,
  viewportHeight: number,
  itemCount: number,
  itemHeight: number,
  overscan = 4,
): VirtualRange {
  const totalHeight = itemCount * itemHeight

  // Sebelum container terukur (tinggi 0, mis. render pertama di jsdom), render
  // semua baris. Setelah ResizeObserver mengisi tinggi sebenarnya, window-nya
  // mengecil dengan sendirinya.
  if (itemCount <= 0 || itemHeight <= 0 || viewportHeight <= 0) {
    return { start: 0, end: itemCount, offsetY: 0, totalHeight }
  }

  const firstVisible = Math.floor(Math.max(0, scrollTop) / itemHeight)
  const visibleCount = Math.ceil(viewportHeight / itemHeight)

  const start = Math.max(0, firstVisible - overscan)
  const end = Math.min(itemCount, firstVisible + visibleCount + overscan)

  return { start, end, offsetY: start * itemHeight, totalHeight }
}

/**
 * useVirtualList mengembalikan jendela baris yang perlu dirender berdasarkan
 * posisi gulir container.
 *
 * Dipasang pada container yang bisa digulir (`overflow-y-auto`): pasang ref,
 * sambungkan onScroll, lalu render `items.slice(start, end)` di dalam wrapper
 * setinggi `totalHeight` dan geser dengan `translateY(offsetY)`.
 */
export function useVirtualList(itemCount: number, itemHeight: number, overscan = 4) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  const measure = useCallback(() => {
    const element = containerRef.current
    if (!element) return
    setScrollTop(element.scrollTop)
    setViewportHeight(element.clientHeight)
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    measure()

    // ResizeObserver menangkap perubahan tinggi container (jendela di-resize,
    // sidebar berubah, dsb). Di lingkungan tanpa ResizeObserver (jsdom) cukup
    // diukur sekali; scroll tetap ditangani lewat onScroll.
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure])

  const range = computeVirtualRange(scrollTop, viewportHeight, itemCount, itemHeight, overscan)

  return { containerRef, onScroll: measure, ...range }
}
