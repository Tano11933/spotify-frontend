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
    <div className="flex min-h-screen flex-col items-center justify-center bg-spotify-black px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/" aria-label="Kembali ke beranda">
            <Logo />
          </Link>
        </div>

        <div className="rounded-md bg-spotify-dark-gray p-8">
          <h1 className="text-2xl font-bold text-spotify-white">{title}</h1>
          {description && <p className="mt-2 text-sm text-spotify-light-gray">{description}</p>}

          <div className="mt-8">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-spotify-light-gray">{footer}</div>}
      </div>
    </div>
  )
}

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border-l-4 border-red-500 bg-spotify-elevated px-4 py-3 text-sm text-spotify-white"
    >
      {message}
    </p>
  )
}
