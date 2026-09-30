import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { getApiErrorMessage, usersApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

interface FollowUserButtonProps {
  userId: string
  /** Status awal dari profil yang sudah dimuat, jadi tidak perlu fetch ulang. */
  isFollowing: boolean
}

/**
 * Tombol ikuti pengguna lain. Statusnya datang dari profil yang sudah dimuat
 * halaman, lalu di-toggle optimistic: ikon berubah dulu, dikembalikan kalau
 * request gagal.
 */
export function FollowUserButton({ userId, isFollowing }: FollowUserButtonProps) {
  const status = useAuthStore((state) => state.status)
  const pushToast = useToastStore((state) => state.push)
  const [isOn, setIsOn] = useState(isFollowing)
  const [isPending, setIsPending] = useState(false)

  if (status !== 'authenticated') return null

  async function toggle() {
    const next = !isOn
    setIsOn(next)
    setIsPending(true)

    try {
      if (next) await usersApi.follow(userId)
      else await usersApi.unfollow(userId)
    } catch (error) {
      setIsOn(!next)
      pushToast({ title: getApiErrorMessage(error), variant: 'error' })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      variant={isOn ? 'secondary' : 'primary'}
      size="sm"
      // Target sentuh 44px di layar kecil, kembali ringkas mulai breakpoint sm.
      className="py-3 sm:py-2"
      aria-pressed={isOn}
      aria-label={isOn ? 'Berhenti mengikuti pengguna' : 'Ikuti pengguna'}
      disabled={isPending}
      onClick={() => void toggle()}
    >
      {isOn ? 'Mengikuti' : 'Ikuti'}
    </Button>
  )
}
