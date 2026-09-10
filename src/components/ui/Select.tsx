import { useId, type SelectHTMLAttributes, type Ref } from 'react'

import { cn } from '@/lib/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function Select({ label, error, hint, placeholder, children, className, id, ref, ...props }: SelectProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const hasError = Boolean(error)
  const describedBy = hasError ? errorId : hint ? hintId : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[0.8125rem] font-semibold tracking-wide text-spotify-white">
        {label}
      </label>

      <div
        className={cn(
          'group/select relative rounded-lg border bg-spotify-elevated transition-all duration-200',
          'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]',
          hasError
            ? 'border-red-500/80 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-500/20'
            : 'border-white/[0.06] hover:border-white/10 focus-within:border-spotify-white focus-within:ring-2 focus-within:ring-white/10 focus-within:bg-[#2e2e2e]',
        )}
      >
        <select
          id={inputId}
          ref={ref}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          // Penting: paksa browser render daftar option dengan palette dark.
          // Di Windows Chrome/Edge, <option> tanpa ini default putih -> teks putih jadi invisible.
          style={{ colorScheme: 'dark' }}
          className={cn(
            'w-full appearance-none bg-transparent px-4 py-3 pr-10 text-[0.9375rem] leading-none text-spotify-white outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // fallback via Tailwind arbitrary: pastikan tiap <option> dark walau CSS global belum ke-load
            '[&>option]:bg-spotify-elevated [&>option]:text-spotify-white',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden className="bg-spotify-elevated text-spotify-light-gray">
              {placeholder}
            </option>
          )}
          {children}
        </select>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-spotify-light-gray transition-colors group-focus-within/select:text-spotify-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
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
