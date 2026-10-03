import { Link } from 'react-router'

import { useNotificationStore } from '@/store/notificationStore'

/**
 * Lonceng notifikasi di top bar dengan badge jumlah belum dibaca.
 *
 * Badge dibatasi "9+" supaya lonceng tidak melebar; angka penuhnya tetap
 * dibacakan lewat aria-label. Lonceng mengarah ke halaman /notifications,
 * bukan dropdown, supaya daftar tetap nyaman dibuka dari layar kecil.
 */
export function NotificationBell() {
  const unread = useNotificationStore((state) => state.unread)

  return (
    <Link
      to="/notifications"
      aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
      className="relative flex h-11 w-11 items-center justify-center rounded-full bg-spotify-black-pure/70 text-spotify-white transition-colors hover:bg-spotify-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white sm:h-9 sm:w-9"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-5v-1l-1.5-1.5V9a5.5 5.5 0 0 0-4.5-5.4V3a1 1 0 0 0-2 0v.6A5.5 5.5 0 0 0 6.5 9v5.5L5 16v1h14Z" />
      </svg>

      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-spotify-green px-1 text-[10px] font-bold text-spotify-black-pure"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
