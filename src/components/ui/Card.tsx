import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
}

/**
 * Kerangka card sesuai DESIGN.md §4 — dipakai ulang oleh ArtistCard,
 * AlbumCard, dan SongCard.
 *
 * `group` di sini penting dan bukan sekadar dekorasi: kelas itu menandai
 * elemen ini sebagai "induk" bagi varian group-hover:* di dalamnya. Itulah
 * mekanisme yang membuat tombol play muncul saat kursor berada di mana pun di
 * atas card, bukan hanya tepat di atas tombolnya.
 */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'group rounded-md bg-spotify-dark-gray p-4',
        'transition-colors duration-200 hover:bg-spotify-elevated',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardCoverProps {
  imageUrl?: string
  alt: string
  /** Artist ditampilkan bulat, album/lagu persegi (DESIGN.md §4). */
  rounded?: 'md' | 'full'
  /** Tombol play yang muncul saat hover. */
  action?: ReactNode
}

export function CardCover({ imageUrl, alt, rounded = 'md', action }: CardCoverProps) {
  const radiusClass = rounded === 'full' ? 'rounded-full' : 'rounded-md'

  return (
    <div className="relative mb-4">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          // loading="lazy" menunda pengambilan gambar sampai mendekati viewport.
          // Di grid berisi puluhan card, ini selisih antara satu dan puluhan
          // request gambar saat halaman pertama dibuka.
          loading="lazy"
          className={cn('aspect-square w-full bg-spotify-elevated object-cover', radiusClass)}
        />
      ) : (
        // Placeholder saat image_url kosong — kolomnya memang boleh kosong di
        // backend (tag validate-nya `omitempty`). Tanpa penanganan ini, browser
        // menampilkan ikon "gambar rusak" yang terlihat seperti bug.
        <div
          className={cn(
            'flex aspect-square w-full items-center justify-center bg-spotify-elevated',
            radiusClass,
          )}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-spotify-light-gray">
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" />
          </svg>
        </div>
      )}

      {action}
    </div>
  )
}
