import { Button } from '@/components/ui/Button'

interface LoadMoreProps {
  /** Berapa item yang sudah tampil dan totalnya, untuk teks penghitung. */
  shown: number
  total: number
  hasMore: boolean
  isLoadingMore: boolean
  /** Error saat memuat halaman berikutnya; halaman pertama ditangani halaman. */
  error?: string | null
  onLoadMore: () => void
  /** Nama item untuk teks penghitung, mis. "album". */
  label: string
}

/**
 * Kontrol "Muat lagi" untuk daftar yang dipaginasi.
 *
 * Tidak merender apa pun kalau semua item sudah tampil dan tidak ada error,
 * jadi halaman yang isinya sedikit tetap bersih. Saat halaman berikutnya gagal
 * dimuat, tombolnya berubah menjadi "Coba lagi" dan pesan errornya muncul di
 * atasnya; item yang sudah tampil tidak hilang.
 */
export function LoadMore({
  shown,
  total,
  hasMore,
  isLoadingMore,
  error,
  onLoadMore,
  label,
}: LoadMoreProps) {
  if (!hasMore && !error) return null

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      {error && <p className="text-sm text-red-300">{error}</p>}

      <Button variant="secondary" size="sm" className="min-h-11" isLoading={isLoadingMore} onClick={onLoadMore}>
        {error ? 'Coba lagi' : 'Muat lagi'}
      </Button>

      <p className="text-xs text-spotify-light-gray">
        Menampilkan {shown} dari {total} {label}
      </p>
    </div>
  )
}
