import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'

import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Pesan error dari Zod/react-hook-form. */
  error?: string
  /** Teks bantuan di bawah field (hilang saat ada error). */
  hint?: string
  /** Ikon di kiri input (mis. mail / lock). */
  leftIcon?: ReactNode
  /**
   * React 19 memperlakukan `ref` sebagai PROP BIASA untuk komponen fungsi.
   * Di React 18 ke bawah ini butuh forwardRef() — sekarang cukup seperti prop lain
   * dan forwardRef sudah deprecated. Ini yang membuat {...register('email')}
   * milik react-hook-form langsung bekerja tanpa wrapper.
   */
  ref?: Ref<HTMLInputElement>
}

export function Input({ label, error, hint, leftIcon, className, id, ref, type, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const isPassword = type === 'password'
  const [showPassword, setShowPassword] = useState(false)
  const resolvedType = isPassword && showPassword ? 'text' : type

  const hasError = Boolean(error)
  const describedBy = hasError ? errorId : hint ? hintId : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-[0.8125rem] font-semibold tracking-wide text-spotify-white"
      >
        {label}
      </label>

      <div
        className={cn(
          'group/input relative flex items-center rounded-lg border bg-spotify-elevated transition-all duration-200',
          'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]',
          hasError
            ? 'border-red-500/80 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-500/20'
            : 'border-white/[0.06] hover:border-white/10 focus-within:border-spotify-white focus-within:ring-2 focus-within:ring-white/10 focus-within:bg-[#2e2e2e]',
        )}
      >
        {leftIcon && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute left-3.5 flex h-5 w-5 items-center justify-center transition-colors',
              hasError ? 'text-red-400' : 'text-spotify-light-gray group-focus-within/input:text-spotify-white',
            )}
          >
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          ref={ref}
          type={resolvedType}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full bg-transparent px-4 py-3 text-[0.9375rem] leading-none text-spotify-white caret-spotify-white outline-none',
            'placeholder:text-spotify-light-gray/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            leftIcon ? 'pl-11' : undefined,
            isPassword && 'pr-11',
            className,
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            onClick={() => setShowPassword((v) => !v)}
            className={cn(
              'absolute right-2 flex h-8 w-8 items-center justify-center rounded-full text-spotify-light-gray transition-colors',
              'hover:bg-white/10 hover:text-spotify-white',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
            )}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 8.7 4 9 4.5a14 14 0 0 1-2.3 2.6M14.5 14.5A3 3 0 0 1 12 15a3 3 0 0 1-3-3c0-.4.1-.8.2-1.1" />
                <path d="M7.5 8.2A14 14 0 0 0 3 9.5S6.3 13.5 12 13.5c1.2 0 2.2-.2 3.1-.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                <path d="M1.5 9.5S5.8 5.5 12 5.5 22.5 9.5 22.5 9.5 18.2 13.5 12 13.5 1.5 9.5 1.5 9.5Z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
            )}
          </button>
        )}
      </div>

      {hasError ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[0.8125rem] leading-relaxed text-red-400 animate-[field-shake_280ms_ease]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
          </svg>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[0.8125rem] leading-relaxed text-spotify-light-gray/70">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
