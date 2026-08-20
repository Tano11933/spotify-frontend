import { cn } from '@/lib/cn'

interface SpinnerProps {
  className?: string
  label?: string
}

/**
 * Indikator loading.
 *
 * role="status" + label tersembunyi membuat screen reader mengumumkan bahwa ada
 * proses berjalan. Tanpa itu, animasi berputar sama sekali tidak terdengar dan
 * halaman terasa "diam" bagi pengguna non-visual.
 */
export function Spinner({ className, label = 'Memuat…' }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center">
      <svg
        className={cn('animate-spin text-current', className ?? 'h-5 w-5')}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
