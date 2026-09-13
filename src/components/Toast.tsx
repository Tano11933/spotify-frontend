import { cn } from '@/lib/cn'
import { useToastStore, type ToastVariant } from '@/store/toastStore'

const VARIANT_BORDER: Record<ToastVariant, string> = {
  info: 'border-l-spotify-green',
  success: 'border-l-spotify-green',
  error: 'border-l-red-500',
}

/**
 * Tumpukan notifikasi — DESIGN.md §4 (Toast) & §7 (slide-in dari kanan).
 *
 * Posisinya bottom-24 supaya duduk DI ATAS now-playing bar (h-20), bukan
 * tertutup olehnya.
 */
export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    // aria-live="polite" membuat screen reader membacakan toast baru tanpa
    // memotong apa yang sedang dibaca. pointer-events-none pada wadahnya
    // mencegah area kosong di sekitar toast memblokir klik ke konten di bawahnya.
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-24 z-50 flex flex-col gap-3"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto w-72 rounded-md border-l-4 bg-spotify-elevated p-4 shadow-lg',
            // motion-safe: hanya berlaku kalau OS user TIDAK meminta pengurangan
            // animasi — animasinya dimatikan dari sumbernya, bukan sekadar
            // dipercepat (DESIGN.md §7).
            'motion-safe:animate-toast-in',
            VARIANT_BORDER[toast.variant],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-spotify-white">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-sm break-words text-spotify-light-gray">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Tutup notifikasi"
              className="shrink-0 text-spotify-light-gray transition-colors hover:text-spotify-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="m12 10.6 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4 5.3 5.3Z" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
