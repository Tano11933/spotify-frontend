import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface SectionGridProps {
  title: string
  /** Tautan "Lihat semua" di kanan judul. */
  seeAllTo?: string
  children: ReactNode
}

/**
 * Judul section + grid card.
 *
 * Jumlah kolomnya persis mengikuti DESIGN.md §6:
 * 2 kolom mobile, 3 tablet, 4–5 desktop.
 */
export function SectionGrid({ title, seeAllTo, children }: SectionGridProps) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold text-spotify-white md:text-2xl">{title}</h2>

        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="text-xs font-medium tracking-wide text-spotify-light-gray uppercase transition-colors hover:text-spotify-white hover:underline"
          >
            Lihat semua
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-6">
        {children}
      </div>
    </section>
  )
}
