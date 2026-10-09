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

```powershell
# 1. backend dulu (repo spotify-backend)
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec api ./seed

# 2. frontend (repo ini)
docker compose -f docker-compose.prod.yml up --build -d

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
- Port host bisa diganti: `FRONTEND_PORT=3001 docker compose -f
  docker-compose.prod.yml up -d`.
- Image frontend tidak memuat `.env` (lihat `.dockerignore`); konfigurasi hanya
  lewat build arg supaya tidak ada dua sumber kebenaran.
- Log: `docker compose -f docker-compose.prod.yml logs -f frontend`.

### CI

Push ke `main` dan pull request menjalankan `.github/workflows/ci.yml`:
`npm ci`, `npm run lint` (oxlint), type-check, dan build produksi.
