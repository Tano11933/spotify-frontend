import { cn } from '@/lib/cn'

interface LogoProps {
  className?: string
  /** Sembunyikan teks, sisakan ikonnya saja (sidebar versi sempit). */
  iconOnly?: boolean
}

/**
 * Logo aplikasi.
 *
 * DESIGN.md §8 secara khusus meminta JANGAN meniru logo Spotify (lingkaran
 * hijau dengan tiga garis melengkung) — meski proyek ini non-komersial, meniru
 * logo adalah wilayah trademark, berbeda dari sekadar terinspirasi tata letak
 * dan palet warnanya. Yang dipakai di sini: ikon not balok generik + wordmark
 * sendiri.
 *
 * Nama "Melodia" hanya penempatan sementara — ganti dengan nama pilihanmu,
 * cukup di file ini.
 */
export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-spotify-green">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5 text-spotify-black-pure"
          aria-hidden="true"
        >
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" />
        </svg>
      </span>

      {!iconOnly && (
        <span className="text-xl font-bold tracking-tight text-spotify-white">Melodia</span>
      )}
    </span>
  )
}
