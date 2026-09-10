import { useState } from 'react'
import { Outlet } from 'react-router'

import { ToastContainer } from '@/components/Toast'
import { MobileNav, Sidebar } from '@/components/layout/Sidebar'
import { NowPlayingBar } from '@/components/layout/NowPlayingBar'
import { TopBar } from '@/components/layout/TopBar'
import { useRealtime } from '@/hooks/useRealtime'

/**
 * Layout 3-panel — DESIGN.md §3.
 *
 *   ┌──────────┬────────────────────────┐
 *   │          │ TopBar                 │
 *   │ Sidebar  ├────────────────────────┤
 *   │          │ <Outlet/> (scrollable) │
 *   ├──────────┴────────────────────────┤
 *   │ NowPlayingBar                     │
 *   └───────────────────────────────────┘
 *
 * <Outlet /> adalah tempat React Router merender route anak. Karena layout ini
 * berada di atas mereka dalam pohon route, ia TIDAK ikut ter-unmount saat
 * pindah halaman — dan itulah yang membuat lagu tetap berjalan mulus saat user
 * berpindah dari Home ke detail album.
 */
export function AppLayout() {
  const [isScrolled, setIsScrolled] = useState(false)

  // Satu-satunya pemanggilan hook realtime di seluruh aplikasi.
  useRealtime()

  return (
    // h-screen + overflow-hidden mengunci layout agar hanya area konten yang
    // bisa di-scroll. Tanpa ini, seluruh halaman ikut bergulir dan now-playing
    // bar akan hilang dari pandangan saat user scroll ke bawah.
    <div className="flex h-screen flex-col overflow-hidden bg-spotify-black">
      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <div
          // Scroll dipantau di sini, lalu hasilnya diteruskan ke TopBar untuk
          // memicu gradient. TopBar sendiri tidak bisa mendeteksinya: yang
          // bergulir adalah elemen ini, bukan window.
          onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 8)}
          // `relative` menjadi jangkar posisi untuk gradient absolute di bawah.
          className="relative flex-1 overflow-y-auto"
        >
          <TopBar isScrolled={isScrolled} />

          {/* Gradient halus di bagian atas konten — DESIGN.md §3. Versi statis,
              sesuai catatan dokumen bahwa warna dinamis dari cover album boleh
              disederhanakan untuk MVP. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-spotify-elevated/40 to-transparent" />

          <main className="relative px-6 pb-8 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <MobileNav />
      <NowPlayingBar />
      <ToastContainer />
    </div>
  )
}
