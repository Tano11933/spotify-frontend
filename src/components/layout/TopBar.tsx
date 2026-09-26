import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'

interface TopBarProps {
  /** true saat area konten sudah di-scroll — memicu latar gradient. */
  isScrolled: boolean
}

/**
 * Bar atas — DESIGN.md §3.
 *
 * Latarnya transparan di posisi paling atas lalu memudar menjadi
 * spotify-black saat konten di-scroll. Itu efek khas Spotify: judul halaman
 * tetap terbaca ketika konten mulai lewat di belakangnya.
 */
export function TopBar({ isScrolled }: TopBarProps) {
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [term, setTerm] = useState('')

  // Sinkronkan kotak pencarian dengan ?q= saat berada di halaman /search —
  // mis. user membuka tautan hasil pencarian atau menekan tombol back.
  const urlQuery = searchParams.get('q') ?? ''
  useEffect(() => {
    if (location.pathname === '/search') setTerm(urlQuery)
  }, [location.pathname, urlQuery])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = term.trim()
    if (query.length < 2) return

    void navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  async function handleLogout() {
    setIsMenuOpen(false)
    await logout()
    void navigate('/', { replace: true })
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-4 transition-colors duration-200 md:px-8',
        isScrolled ? 'bg-spotify-black/95 backdrop-blur' : 'bg-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          // navigate(-1) meniru tombol Back browser — mundur satu langkah di
          // riwayat, bukan pindah ke path tertentu.
          onClick={() => void navigate(-1)}
          aria-label="Kembali"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-spotify-black-pure/70 text-spotify-white transition-colors hover:bg-spotify-black-pure"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6 4.6-4.6Z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => void navigate(1)}
          aria-label="Maju"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-spotify-black-pure/70 text-spotify-white transition-colors hover:bg-spotify-black-pure"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="m8.6 7.4 1.4-1.4 6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6Z" />
          </svg>
        </button>
      </div>

      {/* Kotak pencarian — di layar kecil disembunyikan; halaman /search tetap
          bisa dibuka lewat menu navigasi. */}
      <form
        onSubmit={handleSearch}
        role="search"
        className="hidden flex-1 items-center gap-2 rounded-full bg-spotify-black-pure/70 px-4 py-2 transition-colors focus-within:bg-spotify-elevated sm:flex sm:max-w-md"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-spotify-light-gray" aria-hidden="true">
          <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
        </svg>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Cari lagu, artist, album…"
          aria-label="Cari"
          className="w-full bg-transparent text-sm text-spotify-white placeholder:text-spotify-light-gray/70 focus:outline-none"
        />
      </form>

      {/*
        Selama status masih 'idle'/'bootstrapping', tidak ada tombol yang
        ditampilkan. Ini yang mencegah kedipan "Masuk / Daftar" sepersekian
        detik saat halaman di-refresh oleh user yang sebenarnya sudah login.
      */}
      {status === 'authenticated' && user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="flex items-center gap-2 rounded-full bg-spotify-black-pure/70 py-1 pr-3 pl-1 transition-colors hover:bg-spotify-elevated"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-spotify-green text-sm font-bold text-spotify-black-pure">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-32 truncate text-sm font-semibold text-spotify-white">
              {user.name}
            </span>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 w-48 rounded-md border border-spotify-border bg-spotify-elevated py-1 shadow-lg"
            >
              <p className="truncate px-4 py-2 text-xs text-spotify-light-gray">{user.email}</p>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                className="w-full px-4 py-2 text-left text-sm text-spotify-white transition-colors hover:bg-spotify-border"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      ) : status === 'unauthenticated' ? (
        <div className="flex items-center gap-2">
          <Link to="/register">
            <Button variant="ghost" size="sm">
              Daftar
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm">Masuk</Button>
          </Link>
        </div>
      ) : null}
    </header>
  )
}
