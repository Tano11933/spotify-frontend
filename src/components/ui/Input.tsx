import { useId, type InputHTMLAttributes, type Ref } from 'react'

import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Pesan error dari Zod/react-hook-form. */
  error?: string
  /**
   * React 19 memperlakukan `ref` sebagai PROP BIASA untuk komponen fungsi.
   * Di React 18 ke bawah, ini butuh forwardRef() — komponen harus dibungkus
   * supaya ref bisa lewat. Sekarang cukup dideklarasikan seperti prop lain,
   * dan forwardRef sudah deprecated. Ini yang membuat {...register('email')}
   * milik react-hook-form (yang mengirimkan ref di dalamnya) langsung bekerja.
   */
  ref?: Ref<HTMLInputElement>
}

export function Input({ label, error, className, id, ref, ...props }: InputProps) {
  // useId menghasilkan id unik yang stabil antar render. Dibutuhkan supaya
  // <label htmlFor> menunjuk ke input yang benar meski komponen ini dipakai
  // berkali-kali di satu halaman — mengetik id manual akan menghasilkan
  // duplikat, dan label yang menunjuk id ganda berhenti berfungsi.
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-spotify-white">
        {label}
      </label>

      <input
        id={inputId}
        ref={ref}
        // aria-invalid memberi tahu screen reader bahwa isian ini salah;
        // aria-describedby menyambungkannya ke teks errornya, sehingga
        // pesan itu ikut dibacakan saat fokus masuk ke input.
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          // DESIGN.md §4 — Input Field
          'rounded-md border bg-spotify-elevated px-4 py-3 text-spotify-white',
          'placeholder:text-spotify-light-gray',
          'transition-colors focus:outline-none',
          error
            ? 'border-red-500 focus:border-red-400'
            : 'border-transparent focus:border-spotify-white',
          className,
        )}
        {...props}
      />

      {/* role="alert" membuat pesan langsung diumumkan begitu muncul. */}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
