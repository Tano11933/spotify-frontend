# DOCKER.md — Development vs Full-Stack Demo

Dua mode terpisah. Jangan campur keduanya dalam satu file compose.

---

## Mode 1 — Development (dipakai sehari-hari)

Backend jalan manual (`go run cmd/api/main.go`), frontend jalan manual (`npm run dev`) — hot-reload cepat dan tidak perlu rebuild image tiap ubah kode. Postgres + Redis dari `docker-compose.yml` repo backend.

```powershell
# terminal 1 (spotify-backend)
docker compose up -d
go run cmd/api/main.go

# terminal 2 (spotify-frontend)
npm ci                       # Node.js 24
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev                   # buka http://localhost:5173
```

---

## Mode 2 — Full-Stack Demo (showcase)

Dipakai saat mau menunjukkan proyek ke recruiter/reviewer tanpa mereka perlu install Go/Node.

### Yang dibangun

| Berkas | Isi |
|---|---|
| `Dockerfile` | Multi-stage: `npm ci` + `vite build` di stage Node, hasil `dist/` disajikan nginx. |
| `nginx.conf` | Fallback SPA (`try_files ... /index.html`) supaya refresh di `/charts` atau `/users/123` tidak 404, plus cache panjang untuk `/assets/`. |
| `docker-compose.prod.yml` | Satu service `frontend` di port 3000. Backend tidak ikut; jalankan dari repo backend. |

### Menjalankan

Siapkan `.env` backend dan gunakan origin `http://localhost:3000` sesuai
panduan backend. [Panduan Docker backend](https://github.com/Tano11933/spotify-backend/blob/main/DOCKER.md)

```powershell
# 1. backend dulu (repo spotify-backend)
docker compose -f docker-compose.prod.yml up --build -d --wait
docker compose -f docker-compose.prod.yml exec api ./seed

# 2. frontend (repo ini)
docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml up --build -d --wait

# buka http://localhost:3000
```

### Catatan penting

- **URL backend di-resolve saat BUILD**, bukan runtime: Vite menanamkan
  `import.meta.env` ke bundle. Karena itu nilainya `http://localhost:9000`
  (diakses browser di host), bukan nama service Docker. Ganti lewat build arg:

  ```powershell
  docker compose -f docker-compose.prod.yml build `
    --build-arg VITE_API_BASE_URL=https://api.contoh.dev `
    --build-arg VITE_WS_URL=wss://api.contoh.dev/ws
  ```

- **CORS backend harus memuat origin frontend.** Compose backend sudah memakai
  `http://localhost:3000` sebagai default `CORS_ALLOWED_ORIGINS`; kalau port
  frontend diganti, samakan nilainya di `.env` backend.
- Di PowerShell, ganti port host dengan `$env:FRONTEND_PORT = '3001'` sebelum
  menjalankan Compose.
- Image frontend tidak memuat `.env` (lihat `.dockerignore`); konfigurasi hanya
  lewat build arg supaya tidak ada dua sumber kebenaran.
- Log: `docker compose -f docker-compose.prod.yml logs -f frontend`.
- `index.html` memakai `Cache-Control: no-cache` supaya browser memeriksa
  entry terbaru. Aset dengan nama ber-hash tetap dapat di-cache lama.
- Gunakan WAV lokal dari panduan demo backend untuk menguji unggah dan seek.
  Browser memerlukan klik untuk mulai memutar. Reload memulihkan posisi akun
  dalam keadaan jeda. Screenshot di README menunjukkan tampilan katalog contoh.
- Hentikan frontend dengan `docker compose -f docker-compose.prod.yml down`,
  lalu hentikan stack backend dengan perintah yang sama dari repo backend.

### CI

CI memakai Node.js 24 untuk `npm ci`, lint, unit test, type-check, dan build
produksi. Workflow Browser E2E menguji playback, upload, library, antrean, dan
autentikasi pada stack terisolasi. [Menjalankan E2E secara lokal](README.md#pengujian-browser)
