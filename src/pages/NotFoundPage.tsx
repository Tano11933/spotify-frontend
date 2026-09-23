import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-xs font-medium tracking-wide text-spotify-light-gray uppercase">
        Error 404
      </p>
      <h1 className="text-3xl font-bold text-spotify-white md:text-5xl">Halaman tidak ditemukan</h1>
      <p className="max-w-md text-sm text-spotify-light-gray">
        Tautan yang kamu buka mungkin salah ketik, atau halamannya sudah dipindahkan.
      </p>
      <Link to="/" className="mt-2">
        <Button>Kembali ke beranda</Button>
      </Link>
    </div>
  )
}
