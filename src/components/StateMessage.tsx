import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

/** Keadaan sedang memuat. */
export function LoadingState({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-spotify-light-gray">
      <Spinner className="h-6 w-6" label={label} />
      <span className="text-sm">{label}</span>
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

/**
 * Keadaan gagal.
 *
 * Selalu menyertakan tombol coba lagi kalau pemanggil menyediakannya —
 * penyebab error paling umum saat development adalah backend belum jalan,
 * dan itu bisa diperbaiki tanpa reload halaman.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-spotify-light-gray">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}

/** Keadaan data kosong — berbeda dari error, dan harus terlihat berbeda juga. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-spotify-light-gray">{message}</p>
    </div>
  )
}
