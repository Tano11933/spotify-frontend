import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface DetailHeroProps {
  /** "Album" / "Artis" — label kecil di atas judul. */
  kind: string
  title: string
  imageUrl?: string
  rounded?: 'md' | 'full'
  /** Baris metadata di bawah judul (jumlah lagu, tahun, dst). */
  meta?: ReactNode
  action?: ReactNode
}

/**
 * Kepala halaman detail: cover besar, judul, metadata, tombol play.
 *
 * Gradient di belakangnya versi statis — DESIGN.md §3 memperbolehkan
 * penyederhanaan ini untuk MVP, alih-alih mengambil warna dominan dari
 * gambar cover.
 */
export function DetailHero({
  kind,
  title,
  imageUrl,
  rounded = 'md',
  meta,
  action,
}: DetailHeroProps) {
  const radiusClass = rounded === 'full' ? 'rounded-full' : 'rounded-md'

  return (
    <header className="mb-8 flex flex-col items-center gap-6 pt-8 sm:flex-row sm:items-end">
      <div className={cn('h-40 w-40 shrink-0 overflow-hidden bg-spotify-elevated shadow-lg md:h-52 md:w-52', radiusClass)}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16 text-spotify-light-gray">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 text-center sm:text-left">
        <p className="text-xs font-medium tracking-wide text-spotify-light-gray uppercase">
          {kind}
        </p>

        {/* break-words mencegah judul panjang tanpa spasi merusak lebar layout. */}
        <h1 className="mt-2 text-3xl font-bold break-words text-spotify-white md:text-5xl">
          {title}
        </h1>

        {meta && <div className="mt-3 text-sm text-spotify-light-gray">{meta}</div>}

        {action && <div className="mt-6 flex justify-center sm:justify-start">{action}</div>}
      </div>
    </header>
  )
}
