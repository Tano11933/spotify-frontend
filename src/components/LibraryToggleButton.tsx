import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { getApiErrorMessage, libraryApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

type LibraryItemKind = 'album' | 'artist'

interface LibraryToggleButtonProps {
  kind: LibraryItemKind
  id: number
}

const LABELS: Record<LibraryItemKind, { on: string; off: string; ariaOn: string; ariaOff: string }> = {
  album: {
    on: 'Tersimpan',
    off: 'Simpan',
    ariaOn: 'Hapus album dari library',
    ariaOff: 'Simpan album ke library',
  },
  artist: {
    on: 'Mengikuti',
    off: 'Ikuti',
    ariaOn: 'Berhenti mengikuti artist',
    ariaOff: 'Ikuti artist',
  },
}

/**
 * Tombol simpan album / ikuti artist.
 *
 * Status awal diambil lewat endpoint `contains` (bukan menebak dari daftar),
 * lalu di-toggle secara optimistic. Tidak dirender kalau belum login.
 */
export function LibraryToggleButton({ kind, id }: LibraryToggleButtonProps) {
  const status = useAuthStore((state) => state.status)
  const pushToast = useToastStore((state) => state.push)
  const [isOn, setIsOn] = useState<boolean | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return

    // Setiap kali id/kind berganti, status lama tidak berlaku lagi.
    setIsOn(null)

    let cancelled = false
    const request =
      kind === 'album' ? libraryApi.albumsContain([id]) : libraryApi.followingContain([id])

    request
      .then((result) => {
        if (!cancelled) setIsOn(Boolean(result[String(id)]))
      })
      .catch(() => {
        // Gagal memuat status: tombol tetap tersembunyi; aksi tulis tetap bisa
        // dicoba lewat halaman lain.
      })

    return () => {
      cancelled = true
    }
  }, [id, kind, status])

  if (status !== 'authenticated' || isOn === null) return null

  async function toggle() {
    const next = !isOn
    setIsOn(next)
    setIsPending(true)

    try {
      if (kind === 'album') {
        if (next) await libraryApi.saveAlbum(id)
        else await libraryApi.removeAlbum(id)
      } else {
        if (next) await libraryApi.followArtist(id)
        else await libraryApi.unfollowArtist(id)
      }
    } catch (error) {
      setIsOn(!next)
      pushToast({ title: getApiErrorMessage(error), variant: 'error' })
    } finally {
      setIsPending(false)
    }
  }

  const labels = LABELS[kind]

  return (
    <Button
      variant={isOn ? 'secondary' : 'primary'}
      size="sm"
      aria-pressed={isOn}
      aria-label={isOn ? labels.ariaOn : labels.ariaOff}
      disabled={isPending}
      onClick={() => void toggle()}
    >
      {isOn ? labels.on : labels.off}
    </Button>
  )
}
