import { useEffect } from 'react'
import { Route, Routes } from 'react-router'

import { GuestOnlyRoute } from '@/components/GuestOnlyRoute'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { AlbumDetailPage } from '@/pages/AlbumDetailPage'
import { AdminPage } from '@/pages/AdminPage'
import { AlbumsPage } from '@/pages/AlbumsPage'
import { ArtistDetailPage } from '@/pages/ArtistDetailPage'
import { ArtistsPage } from '@/pages/ArtistsPage'
import { BrowsePage } from '@/pages/BrowsePage'
import { ChartsPage } from '@/pages/ChartsPage'
import { FeedPage } from '@/pages/FeedPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { GenreDetailPage } from '@/pages/GenreDetailPage'
import { HomePage } from '@/pages/HomePage'
import { LibraryPage } from '@/pages/LibraryPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { PlaylistsPage } from '@/pages/PlaylistsPage'
import { QueuePage } from '@/pages/QueuePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { SearchPage } from '@/pages/SearchPage'
import { UserProfilePage } from '@/pages/UserProfilePage'
import { useAuthStore } from '@/store/authStore'

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/*
        reset-password sengaja TIDAK dibungkus GuestOnlyRoute. Halaman ini
        dibuka dari tautan email dan validitasnya ditentukan token di URL,
        bukan status login. User yang kebetulan masih punya sesi aktif tetap
        harus bisa menyelesaikan reset.
      */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Semua halaman katalog berbagi satu AppLayout — lihat catatan di
          AppLayout soal kenapa itu membuat pemutar tidak terputus. */}
      <Route path="/" element={<AppLayout />}>
        {/* `index` = route yang cocok saat path-nya persis sama dengan induknya. */}
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="genres/:id" element={<GenreDetailPage />} />
        <Route path="charts" element={<ChartsPage />} />
        <Route path="artists" element={<ArtistsPage />} />
        <Route path="artists/:id" element={<ArtistDetailPage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="albums/:id" element={<AlbumDetailPage />} />
        <Route path="users/:id" element={<UserProfilePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="library" element={<LibraryPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>

        {/* "*" menangkap semua path yang tidak cocok dengan route mana pun. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
