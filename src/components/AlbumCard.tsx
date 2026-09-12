import { useState } from 'react'
import { Link } from 'react-router'

import { Card, CardCover } from '@/components/ui/Card'
import { PlayButton } from '@/components/ui/PlayButton'
import { catalogApi, getApiErrorMessage } from '@/lib/api'
import { formatYear } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'
import type { Album } from '@/types'

interface AlbumCardProps {
  album: Album
}

export function AlbumCard({ album }: AlbumCardProps) {
  const play = usePlayerStore((state) => state.play)
  const pushToast = useToastStore((state) => state.push)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * GET /api/albums (list) hanya mem-Preload("Artist"), TIDAK menyertakan
   * daftar lagunya — jadi di titik ini kita belum tahu isi album ini apa saja.
   * Lagunya baru diambil saat tombol play benar-benar ditekan, bukan sekaligus
   * untuk semua album saat halaman dimuat.
   */
  async function handlePlay() {
    setIsLoading(true)
    try {
      const detail = await catalogApi.getAlbum(album.id)
      const songs = detail.songs ?? []
      const firstSong = songs[0]

      if (!firstSong) {
        pushToast({ title: 'Album ini belum punya lagu', variant: 'info' })
        return
      }

      play(firstSong, songs)
    } catch (error) {
      pushToast({ title: 'Gagal memutar album', description: getApiErrorMessage(error), variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardCover
        imageUrl={album.cover_url}
        alt={album.title}
        action={
          <PlayButton
            onClick={handlePlay}
            label={album.title}
            className={isLoading ? 'pointer-events-none opacity-70' : undefined}
          />
        }
      />

      <Link to={`/albums/${album.id}`} className="block">
        <h3 className="truncate text-base font-semibold text-spotify-white">{album.title}</h3>
        <p className="mt-1 truncate text-sm text-spotify-light-gray">
          {formatYear(album.release_date)}
          {album.artist ? ` • ${album.artist.name}` : ''}
        </p>
      </Link>
    </Card>
  )
}
