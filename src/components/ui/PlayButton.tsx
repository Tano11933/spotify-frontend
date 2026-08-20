import { cn } from '@/lib/cn'

interface PlayButtonProps {
  onClick: () => void
  /** Nama lagu/album, dipakai untuk label aksesibilitas. */
  label: string
  isPlaying?: boolean
  /** true = tombol besar yang selalu tampak (halaman detail). */
  prominent?: boolean
  className?: string
}

/**
 * Tombol play hijau — DESIGN.md §4 & §7.
 *
 * Di dalam card, tombol ini tersembunyi (opacity-0, tergeser 8px ke bawah) dan
 * muncul naik saat card di-hover. Efek "muncul dari bawah" itu yang membuat
 * interaksinya terasa khas Spotify.
 */
export function PlayButton({
  onClick,
  label,
  isPlaying = false,
  prominent = false,
  className,
}: PlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${isPlaying ? 'Jeda' : 'Putar'} ${label}`}
      className={cn(
        'flex items-center justify-center rounded-full bg-spotify-green text-spotify-black-pure shadow-lg',
        'transition duration-200 hover:scale-105 hover:bg-spotify-green-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
        prominent
          ? 'h-14 w-14'
          : cn(
              'absolute right-2 bottom-2 h-12 w-12',
              'translate-y-2 opacity-0',
              'group-hover:translate-y-0 group-hover:opacity-100',
              // Tanpa ini, tombol tidak akan pernah terlihat oleh pengguna
              // keyboard: mereka tidak menghasilkan hover sama sekali, jadi
              // tombolnya tetap opacity-0 meski sedang terfokus.
              'focus-visible:translate-y-0 focus-visible:opacity-100',
            ),
        className,
      )}
    >
      {isPlaying ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M8 5h3v14H8V5Zm5 0h3v14h-3V5Z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5 translate-x-[1px]"
          aria-hidden="true"
        >
          <path d="M8 5.14v13.72a.5.5 0 0 0 .77.42l10.29-6.86a.5.5 0 0 0 0-.84L8.77 4.72a.5.5 0 0 0-.77.42Z" />
        </svg>
      )}
    </button>
  )
}
