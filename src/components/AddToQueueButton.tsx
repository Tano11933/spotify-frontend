import { useState } from 'react'

import { getApiErrorMessage, playerApi } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

interface AddToQueueButtonProps {
  songId: number
  title: string
  className?: string
}

/**
 * Menambahkan lagu ke antrean server (GET /api/me/player/queue). Antrean
 * tersimpan di akun, jadi isinya ikut user ke device lain.
 */
export function AddToQueueButton({ songId, title, className }: AddToQueueButtonProps) {
  const status = useAuthStore((state) => state.status)
  const pushToast = useToastStore((state) => state.push)
  const [isPending, setIsPending] = useState(false)

  if (status !== 'authenticated') return null

  async function add() {
    setIsPending(true)
    try {
      await playerApi.addToQueue(songId)
      pushToast({ title: 'Ditambahkan ke antrean', description: title, variant: 'success' })
    } catch (error) {
      pushToast({ title: 'Gagal menambahkan ke antrean', description: getApiErrorMessage(error), variant: 'error' })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      aria-label={`Tambahkan ${title} ke antrean`}
      disabled={isPending}
      onClick={(event) => {
        // Baris lagu punya tombol play sendiri; jangan ikut memicunya.
        event.stopPropagation()
        void add()
      }}
      className={cn(
        'flex items-center justify-center rounded-full p-1 transition-colors',
        'text-spotify-light-gray hover:text-spotify-white',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
        'disabled:opacity-50',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M4 6h16v2H4V6Zm0 5h10v2H4v-2Zm0 5h7v2H4v-2Zm13-3v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z" />
      </svg>
    </button>
  )
}
