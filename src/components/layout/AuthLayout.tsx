import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Logo } from '@/components/Logo'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-spotify-black px-6 py-12">
      {/* Aura halus di belakang card — gradient statis, bukan cover dinamis, sesuai DESIGN.md §3 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_800px_400px_at_50%_-10%,rgba(29,185,84,0.08),transparent_60%),radial-gradient(ellipse_600px_300px_at_90%_20%,rgba(255,255,255,0.04),transparent_60%)]"
      />

      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Link to="/" aria-label="Kembali ke beranda" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-8 shadow-[0_20px_60px_-16px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-spotify-white">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-spotify-light-gray">{description}</p>
          )}

          <div className="mt-7">{children}</div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm leading-relaxed text-spotify-light-gray">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-200"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
      </svg>
      <span>{message}</span>
    </p>
  )
}
