import { useCallback, useEffect, useRef, useState } from 'react'

import { getApiErrorMessage } from '@/lib/api'

interface AsyncState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

/**
 * Dependency di hook ini dibatasi pada nilai PRIMITIF, bukan DependencyList
 * bawaan React yang menerima apa saja.
 *
 * Alasannya: perbandingan dependency React memakai Object.is, jadi objek atau
 * array yang dibuat ulang tiap render selalu dianggap berbeda dan akan memicu
 * pengambilan data tanpa henti. Membatasi tipenya di sini membuat kesalahan itu
 * ketahuan saat compile, bukan setelah melihat ratusan request di tab Network.
 */
type PrimitiveDeps = readonly (string | number | boolean | null | undefined)[]

/**
 * Hook pengambil data sederhana: jalankan promise, sediakan data/error/loading.
 *
 * Project ini tidak memakai TanStack Query (tidak ada di tech stack PRD.md §3),
 * jadi tiga keadaan itu diurus sendiri di sini — satu kali, bukan diulang di
 * setiap halaman.
 *
 * Bagian terpenting adalah `cancelled`. Tanpa itu ada bug yang khas dan sulit
 * dilacak: user membuka artist A lalu cepat berpindah ke artist B. Kalau
 * response A ternyata datang belakangan, ia akan menimpa data B — halaman
 * menampilkan artist yang salah tanpa satu pun error. Menandai efek yang sudah
 * usang sebagai "cancelled" membuat hasilnya dibuang.
 */
export function useAsync<T>(
  factory: () => Promise<T>,
  deps: PrimitiveDeps,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
  })
  const [reloadToken, setReloadToken] = useState(0)

  /**
   * factory disimpan di ref, bukan dimasukkan ke daftar dependency efek.
   *
   * Alasannya: pemanggil hampir selalu menulis fungsi inline
   * (`() => catalogApi.getArtists()`), yang identitasnya baru setiap render.
   * Kalau itu jadi dependency, efeknya jalan tiap render — request tanpa henti.
   * Yang menentukan kapan mengambil ulang adalah `deps` dari pemanggil.
   */
  const factoryRef = useRef(factory)

  // Ref di-update di dalam efek, BUKAN langsung saat render.
  // Menulis ke ref selama render adalah efek samping yang dilarang React
  // (dan ditandai oleh React Compiler): render harus murni, karena React boleh
  // menjalankannya ulang atau membatalkannya kapan saja. Efek tanpa dependency
  // array ini jalan setiap render dan dideklarasikan LEBIH DULU, jadi ref-nya
  // sudah terbarui sebelum efek pengambil data di bawah dijalankan.
  useEffect(() => {
    factoryRef.current = factory
  })

  /**
   * deps diringkas jadi satu string.
   *
   * Menulis `useEffect(fn, [...deps, reloadToken])` sebetulnya bekerja, tapi
   * aturan lint react-hooks menolaknya — daftar dependency yang isinya bukan
   * identifier sederhana tidak bisa diperiksa secara statis, sehingga
   * kesalahan di dalamnya tidak akan pernah ketahuan oleh linter. Meringkasnya
   * jadi satu nilai primitif mengembalikan kemampuan itu, dan aman karena
   * tipenya sudah dibatasi hanya primitif.
   */
  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    let cancelled = false
    setState({ data: null, error: null, isLoading: true })

    factoryRef
      .current()
      .then((data) => {
        if (cancelled) return
        setState({ data, error: null, isLoading: false })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({ data: null, error: getApiErrorMessage(error), isLoading: false })
      })

    // Fungsi yang dikembalikan efek adalah CLEANUP — React menjalankannya saat
    // komponen unmount atau sebelum efek yang sama jalan lagi.
    return () => {
      cancelled = true
    }
  }, [depsKey, reloadToken])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return { ...state, reload }
}
