import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/Spinner'

/**
 * Tombol sesuai DESIGN.md §4.
 *
 * Semua kelas warna berasal dari token @theme — tidak ada satu pun hex di file
 * ini. Itu bukan kerapian kosmetik: kalau nanti palet berubah, cukup satu blok
 * di index.css yang disentuh, bukan puluhan komponen.
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Menampilkan spinner dan menonaktifkan tombol — untuk submit form. */
  isLoading?: boolean
  children: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Teks gelap di atas hijau, bukan putih — ini ciri khas Spotify (DESIGN.md §4)
  // sekaligus keputusan kontras yang benar: putih di atas #1DB954 hanya
  // mencapai rasio ~2.3:1, jauh di bawah ambang WCAG AA (4.5:1).
  primary:
    'bg-spotify-green text-spotify-black-pure hover:bg-spotify-green-hover hover:scale-105',
  secondary:
    'border border-spotify-light-gray text-spotify-white hover:border-spotify-white hover:scale-105',
  ghost: 'text-spotify-light-gray hover:text-spotify-white',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-8 py-3 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // type default sebuah <button> di dalam <form> adalah "submit" — sumber
      // bug klasik berupa form yang ter-submit oleh tombol yang tidak
      // dimaksudkan untuk itu. Default eksplisit di sini menutupnya, dan
      // pemanggil tetap bisa menimpanya lewat props.
      type="button"
      disabled={disabled ?? isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold',
        'transition-transform duration-200',
        // focus-visible (bukan focus) hanya muncul saat navigasi keyboard,
        // sehingga pengguna keyboard tetap terbantu tanpa ring yang mengganggu
        // saat diklik mouse.
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}
