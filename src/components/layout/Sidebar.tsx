import { NavLink } from 'react-router'

import { Logo } from '@/components/Logo'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const HomeIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3L12 3Z" />
  </svg>
)

const ArtistIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-8 1.7-8 4.5V21h16v-2.5c0-2.8-4.7-4.5-8-4.5Z" />
  </svg>
)

const AlbumIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 13.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Zm0-4.5a1 1 0 1 0 1 1 1 1 0 0 0-1-1Z" />
  </svg>
)

const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
  </svg>
)

const HeartIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.6-9.2A5.4 5.4 0 0 1 12 6.1a5.4 5.4 0 0 1 9.6 5.7C19.5 16.4 12 21 12 21Z" />
  </svg>
)

const PlaylistIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M4 5h16v2H4V5Zm0 6h10v2H4v-2Zm0 6h7v2H4v-2Zm13-5v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z" />
  </svg>
)

const AdminIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M12 2 4 5v6c0 5.2 3.4 9.8 8 11 4.6-1.2 8-5.8 8-11V5l-8-3Zm0 4 4 1.5V11c0 3.4-2 6.5-4 7.6-2-1.1-4-4.2-4-7.6V7.5L12 6Zm-1 3v3H8v2h3v3h2v-3h3v-2h-3V9h-2Z" />
  </svg>
)

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Beranda', icon: HomeIcon },
  { to: '/search', label: 'Cari', icon: SearchIcon },
  { to: '/library', label: 'Lagu Disukai', icon: HeartIcon },
  { to: '/artists', label: 'Artis', icon: ArtistIcon },
  { to: '/albums', label: 'Album', icon: AlbumIcon },
  { to: '/playlists', label: 'Playlist', icon: PlaylistIcon },
]

/**
 * Sidebar kiri — DESIGN.md §3.
 *
 * Responsif sesuai §6: tersembunyi di mobile (digantikan bottom nav),
 * hanya-ikon di tablet, penuh dengan label di desktop.
 */
export function Sidebar() {
  const user = useAuthStore((state) => state.user)
  const items = user?.role === 'admin'
    ? [...NAV_ITEMS, { to: '/admin', label: 'Admin', icon: AdminIcon }]
    : NAV_ITEMS

  return (
    <aside className="hidden shrink-0 flex-col gap-6 bg-spotify-black-pure p-4 sm:flex lg:w-64">
      <div className="px-2 py-2">
        {/* Label logo ikut hilang saat sidebar menyempit di tablet. */}
        <span className="lg:hidden">
          <Logo iconOnly />
        </span>
        <span className="hidden lg:inline-flex">
          <Logo />
        </span>
      </div>

      <nav aria-label="Navigasi utama">
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.to}>
              {/*
                NavLink adalah Link yang tahu apakah dirinya sedang aktif.
                className-nya bisa diberi fungsi yang menerima { isActive } —
                jadi tidak perlu membandingkan useLocation().pathname manual.

                `end` membuat "/" hanya aktif saat path-nya benar-benar "/".
                Tanpa itu, Beranda akan ikut tersorot di SEMUA halaman, karena
                setiap path diawali "/".
              */}
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-4 rounded-md px-3 py-2 text-base font-semibold transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
                    isActive
                      ? 'bg-spotify-elevated text-spotify-white'
                      : 'text-spotify-light-gray hover:text-spotify-white',
                  )
                }
              >
                {item.icon}
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

/**
 * Navigasi bawah khusus mobile — pengganti sidebar di layar < 640px
 * (DESIGN.md §6). Diletakkan di atas now-playing bar.
 */
export function MobileNav() {
  const user = useAuthStore((state) => state.user)
  const items = user?.role === 'admin'
    ? [...NAV_ITEMS, { to: '/admin', label: 'Admin', icon: AdminIcon }]
    : NAV_ITEMS

  return (
    <nav
      aria-label="Navigasi utama"
      className="flex items-center justify-around border-t border-spotify-border bg-spotify-black-pure py-2 sm:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-4 py-1 text-xs font-medium transition-colors',
              isActive ? 'text-spotify-white' : 'text-spotify-light-gray',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
