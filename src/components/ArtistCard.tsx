import { Link } from 'react-router'

import { Card, CardCover } from '@/components/ui/Card'
import type { Artist } from '@/types'

interface ArtistCardProps {
  artist: Artist
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Card>
      {/*
        Seluruh card dibungkus <Link>, bukan dipasangi onClick di <div>.
        Bedanya nyata: <a> bisa difokus dengan Tab, dibuka di tab baru dengan
        Ctrl+klik, dan dikenali screen reader sebagai tautan. <div onClick>
        tidak mendapat satu pun dari itu.
      */}
      <Link to={`/artists/${artist.id}`} className="block">
        <CardCover imageUrl={artist.image_url} alt={artist.name} rounded="full" />

        <h3 className="truncate text-base font-semibold text-spotify-white">{artist.name}</h3>
        <p className="mt-1 text-sm text-spotify-light-gray">Artis</p>
      </Link>
    </Card>
  )
}
