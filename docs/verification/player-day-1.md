# Verifikasi player audio: Hari 1

Tanggal pemeriksaan: 23 Oktober 2026.

## Perubahan

- Pemutaran memakai endpoint stream tanpa membandingkannya dengan URL eksternal lagu.
- Hook `useAudioPlayback` mengelola sumber audio, event media, metadata, dan kegagalan promise `play()`.
- Posisi tersimpan diterapkan setelah metadata tersedia dan dibatasi durasi audio aktual.
- Replay objek lagu yang sama dan antrean satu lagu memulai pemutaran baru.
- Previous setelah tiga detik mengubah posisi elemen audio, bukan hanya store.
- Kegagalan audio menghentikan state bermain; progress tidak lagi disimulasikan.
- Status memuat, pesan gagal, dan tombol Coba lagi tersedia pada player.
- Restore sesi dibatalkan saat unmount/logout/ganti akun. Posisi akun sebelumnya tidak disimpan ke akun baru.

## Pemeriksaan otomatis

Jalankan dari root frontend:

```sh
npm test
npm run lint
npm run build
```

Tes regresi berada di `playerStore.test.ts`, `useAudioPlayback.test.tsx`, `usePlayerSync.test.tsx`, dan `NowPlayingBar.test.tsx`.

Skenario mencakup promise play lama yang selesai setelah pergantian lagu/pause, penolakan autoplay, StrictMode, metadata terlambat, seek, replay, next/previous, kegagalan/retry, logout, pergantian akun, penyimpanan berkala, dan request keepalive saat pagehide.

## Pemeriksaan browser

Chrome headless memakai komponen player asli dalam harness Vite sementara. Respons stream diisolasi dengan WAV PCM mono 12 detik yang dihasilkan untuk pengujian; tidak memakai lagu katalog atau layanan audio eksternal. Harness dan hasil screenshot disimpan sebagai artefak lokal pengerjaan, tidak ditambahkan ke bundle aplikasi.

Hasil yang diverifikasi:

- Klik pemilihan lagu pertama menjalankan native audio; `paused` menjadi false dan `currentTime` bertambah.
- Durasi WAV aktual 12 detik menggantikan metadata katalog fixture 120 detik.
- Pause, resume, seek, previous, next, pemilihan objek lagu yang sama, dan volume mengubah elemen audio.
- Restore pada detik ke-4 tetap pause sampai pengguna menekan Putar.
- Event ended dari audio sungguhan memindahkan player ke lagu berikutnya.
- Respons 404 menampilkan pesan gagal, menghentikan state bermain, dan tidak menaikkan progress selama menunggu.
- Retry lewat keyboard menjalankan audio kembali.
- Tidak ada overflow horizontal pada viewport 320, 375, 768, 1024, dan 1280 px. Tombol playback memiliki area 44 x 44 px.
- Link Antrean dapat digunakan tanpa melepas player yang terpasang dalam harness.
- Tidak ada uncaught page error. Respons 404 dan pembatalan request ketika lagu berpindah memang bagian skenario test.

Pemeriksaan ini membuktikan perilaku komponen dan native audio dengan fixture. Login, upload admin, database playback, dan katalog backend aktif belum diuji sebagai perjalanan end-to-end pada Hari 1.

## Gate UI untuk bagian player yang berubah

- Hard Gate PASS: state kosong/loading/error tersedia; tombol playback/retry dan slider memiliki aksi nyata, label, serta fokus yang terlihat; tidak ada progress palsu atau overflow pada viewport pengujian.
- Purpose Gate PASS: palet hitam/putih/hijau dan Inter mengikuti DESIGN.md; ikon playback menyatakan fungsi musik; tidak menambah dekorasi, gradient, atau animasi berulang.
- Liveliness PASS: ENERGY 1 / RHYTHM 1 / MOTION 1; tombol play menjadi fokus, informasi lagu dan kontrol terpisah, hijau dipakai untuk posisi/volume aktif.
- Quality PASS: tes komponen dan native audio dijalankan; error/retry diperiksa secara visual pada desktop/mobile. Tema Spotify mengikuti permintaan proyek yang sudah ada.
- Kontras teks sekunder #B3B3B3 pada #000000 = 10,02:1; accent #1DB954 pada #000000 = 8,12:1; putih pada hitam = 21:1. Focus menggunakan putih dengan offset dari kontrol.

Gate ini berlaku pada player yang diubah, bukan pernyataan audit seluruh halaman aplikasi.

## Batasan yang masih ada

- Browser tetap dapat menolak autoplay. Pesan gagal meminta tindakan pengguna; kode tidak mencoba melewati kebijakan browser.
- Lagu seeder tanpa file audio valid sekarang menampilkan kegagalan, bukan simulasi pemutaran.
- History masih dicatat berdasarkan state pemilihan player melalui useRealtime. Pemindahan pencatatan ke keberhasilan audio dan integrasi antrean server dijadwalkan pada Hari 3.
- Peringatan bundle JavaScript di atas 500 kB masih ada; code splitting dijadwalkan pada Hari 8.
