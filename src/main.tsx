import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

// @fontsource menyediakan file font Inter sebagai paket npm (self-hosted),
// bukan lewat <link> ke Google Fonts. Keuntungannya: tidak ada request ke
// server pihak ketiga, font ikut ter-bundle & ter-cache bersama aset lain.
// Empat weight ini sesuai tabel tipografi DESIGN.md §2:
// 400 body, 500 caption/label, 600 card title, 700 heading.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      BrowserRouter memakai History API browser, sehingga URL-nya bersih
      (/albums/1) tanpa tanda pagar. Konsekuensinya saat deploy nanti: server
      harus mengembalikan index.html untuk SEMUA path, kalau tidak me-refresh
      halaman di /albums/1 akan menghasilkan 404 dari server — ini yang diatur
      lewat `try_files` di nginx.conf pada tahap Docker (DOCKER.md).
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
