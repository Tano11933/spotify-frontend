import { useEffect } from 'react'
import { Route, Routes } from 'react-router'

import { GuestOnlyRoute } from '@/components/GuestOnlyRoute'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PageRoute } from '@/components/PageRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/store/authStore'

const pages = {
  home: () => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })),
  search: () => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })),
  browse: () => import('@/pages/BrowsePage').then((m) => ({ default: m.BrowsePage })),
  genre: () => import('@/pages/GenreDetailPage').then((m) => ({ default: m.GenreDetailPage })),
  charts: () => import('@/pages/ChartsPage').then((m) => ({ default: m.ChartsPage })),
  artists: () => import('@/pages/ArtistsPage').then((m) => ({ default: m.ArtistsPage })),
  artist: () => import('@/pages/ArtistDetailPage').then((m) => ({ default: m.ArtistDetailPage })),
  albums: () => import('@/pages/AlbumsPage').then((m) => ({ default: m.AlbumsPage })),
  album: () => import('@/pages/AlbumDetailPage').then((m) => ({ default: m.AlbumDetailPage })),
  releases: () => import('@/pages/NewReleasesPage').then((m) => ({ default: m.NewReleasesPage })),
  profile: () => import('@/pages/UserProfilePage').then((m) => ({ default: m.UserProfilePage })),
  library: () => import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })),
  feed: () => import('@/pages/FeedPage').then((m) => ({ default: m.FeedPage })),
  notifications: () => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
  playlists: () => import('@/pages/PlaylistsPage').then((m) => ({ default: m.PlaylistsPage })),
  queue: () => import('@/pages/QueuePage').then((m) => ({ default: m.QueuePage })),
  admin: () => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })),
  sessions: () => import('@/pages/SessionsPage').then((m) => ({ default: m.SessionsPage })),
  login: () => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
  register: () => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
  forgot: () => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
  reset: () => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
  notFound: () => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
}

export default function App() {
  useEffect(() => {
    // Pemulihan sesi dijalankan sekali saat aplikasi dibuka.
    //
    // Penjaga status === 'idle' bukan sekadar kehati-hatian: di development,
    // <StrictMode> sengaja memasang-melepas-memasang ulang setiap efek untuk
    // menyingkap efek yang tidak aman dijalankan dua kali. Tanpa penjaga ini,
    // bootstrap akan berjalan dua kali setiap kali halaman dibuka.
    //
    // getState() dipakai (bukan hook di badan komponen) supaya efek ini tidak
    // perlu bergantung pada nilai apa pun — daftar dependency-nya benar-benar
    // kosong, dan artinya "jalankan sekali saat mount".
    if (useAuthStore.getState().status === 'idle') {
      void useAuthStore.getState().bootstrap()
    }
  }, [])

  return (
    <Routes>
      {/* Halaman auth: tanpa sidebar/now-playing bar, dan hanya untuk tamu. */}
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<PageRoute load={pages.login} />} />
        <Route path="/register" element={<PageRoute load={pages.register} />} />
        <Route path="/forgot-password" element={<PageRoute load={pages.forgot} />} />
      </Route>

      {/*
        reset-password sengaja TIDAK dibungkus GuestOnlyRoute. Halaman ini
        dibuka dari tautan email dan validitasnya ditentukan token di URL,
        bukan status login. User yang kebetulan masih punya sesi aktif tetap
        harus bisa menyelesaikan reset.
      */}
      <Route path="/reset-password" element={<PageRoute load={pages.reset} />} />

      {/* Semua halaman katalog berbagi satu AppLayout — lihat catatan di
          AppLayout soal kenapa itu membuat pemutar tidak terputus. */}
      <Route path="/" element={<AppLayout />}>
        {/* `index` = route yang cocok saat path-nya persis sama dengan induknya. */}
        <Route index element={<PageRoute load={pages.home} />} />
        <Route path="search" element={<PageRoute load={pages.search} />} />
        <Route path="browse" element={<PageRoute load={pages.browse} />} />
        <Route path="genres/:id" element={<PageRoute load={pages.genre} />} />
        <Route path="charts" element={<PageRoute load={pages.charts} />} />
        <Route path="artists" element={<PageRoute load={pages.artists} />} />
        <Route path="artists/:id" element={<PageRoute load={pages.artist} />} />
        <Route path="albums" element={<PageRoute load={pages.albums} />} />
        <Route path="albums/:id" element={<PageRoute load={pages.album} />} />
        <Route path="new-releases" element={<PageRoute load={pages.releases} />} />
        <Route path="users/:id" element={<PageRoute load={pages.profile} />} />
        <Route element={<ProtectedRoute />}>
          <Route path="library" element={<PageRoute load={pages.library} />} />
          <Route path="feed" element={<PageRoute load={pages.feed} />} />
          <Route path="notifications" element={<PageRoute load={pages.notifications} />} />
          <Route path="playlists" element={<PageRoute load={pages.playlists} />} />
          <Route path="queue" element={<PageRoute load={pages.queue} />} />
          <Route path="admin" element={<PageRoute load={pages.admin} />} />
          <Route path="account/sessions" element={<PageRoute load={pages.sessions} />} />
        </Route>

        {/* "*" menangkap semua path yang tidak cocok dengan route mana pun. */}
        <Route path="*" element={<PageRoute load={pages.notFound} />} />
      </Route>
    </Routes>
  )
}
