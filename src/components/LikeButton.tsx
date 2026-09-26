import { useEffect } from 'react'

import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'
import { useLikedStore } from '@/store/likedStore'

interface LikeButtonProps {
  songId: number
  className?: string
}

/**
 * Tombol hati untuk "Lagu Disukai".
 *
 * Tidak merender apa pun kalau user belum login — menyimpan lagu adalah aksi
 * yang butuh identitas, jadi tombolnya tidak ditampilkan daripada menampilkan
 * tombol yang pasti gagal.
 */
export function LikeButton({ songId, className }: LikeButtonProps) {
  const status = useAuthStore((state) => state.status)
  const isLiked = useLikedStore((state) => state.liked[songId] ?? false)
  const ensureLoaded = useLikedStore((state) => state.ensureLoaded)
  const toggle = useLikedStore((state) => state.toggle)

  useEffect(() => {
    if (status === 'authenticated') ensureLoaded([songId])
  }, [ensureLoaded, songId, status])

  if (status !== 'authenticated') return null

  return (
    <button
      type="button"
      aria-pressed={isLiked}
      aria-label={isLiked ? 'Hapus dari Lagu Disukai' : 'Simpan ke Lagu Disukai'}
      onClick={(event) => {
        // Baris lagu punya tombol play sendiri; tanpa stopPropagation klik hati
        // ikut memicu pemutaran.
        event.stopPropagation()
        void toggle(songId)
      }}
      className={cn(
        'flex items-center justify-center rounded-full p-1 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
        isLiked
          ? 'text-spotify-green hover:text-spotify-green-hover'
          : 'text-spotify-light-gray hover:text-spotify-white',
        className,
      )}
    >
      {isLiked ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.6-9.2A5.4 5.4 0 0 1 12 6.1a5.4 5.4 0 0 1 9.6 5.7C19.5 16.4 12 21 12 21Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4" aria-hidden="true">
          <path d="M12 20.2S4.8 15.8 2.9 11.6A5 5 0 0 1 12 6.9a5 5 0 0 1 9.1 4.7c-1.9 4.2-9.1 8.6-9.1 8.6Z" />
        </svg>
      )}
    </button>
  )
}
