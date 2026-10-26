# Verifikasi antrean playback: Hari 3

Tanggal: 25 Oktober 2026. Implementasi mencakup backend dan frontend.

## Perilaku baru

- Next dan event ended mengambil entri tersedia dari antrean akun sebelum melanjutkan konteks album/playlist lokal.
- Konteks lokal dipertahankan saat lagu antrean diputar. Setelah antrean kosong, pemutaran kembali ke lagu berikutnya dari konteks tersebut.
- Memilih lagu dari halaman antrean memakai ID entri, sehingga kemunculan lagu yang sama dapat dipilih dan dihapus secara tepat.
- Reservasi diperoleh sebelum audio dimulai. Entri baru dikonsumsi setelah event native playing, lalu history dicatat.
- Audio gagal melepaskan lease dan tidak mencatat history; retry mengambil reservasi baru.
- Pause/resume dan buffering pada versi pemutaran yang sama tidak dihitung ulang. Replay eksplisit memakai versi baru.
- Penjaga pencatatan disimpan di store sehingga layout remount tidak mengirim history untuk versi yang sama dua kali.
- Marker playing menyertakan identitas akun. Marker akun sebelumnya tidak digunakan untuk mencatat history akun berikutnya.
- Respons reservasi yang tiba setelah pengguna memilih lagu lain tidak menimpa pilihan baru; lease tersebut dilepaskan.
- Pembaruan antrean setelah konsumsi memuat ulang rentang yang sudah ditampilkan, memakai hook pagination Hari 2.

## Tes otomatis

```sh
npm test -- --maxWorkers=2
npm run lint
npm run build
```

Tes baru berada di useQueuePlayback.test.tsx. Tes audio, player store, komponen bar, dan halaman antrean juga disesuaikan. Skenario mencakup native playing, kegagalan/lease expiry, retry, queue kosong, local context, rapid next, pilihan manual saat request tertunda, pergantian akun, replay, dan remount.

Suite lengkap: 118 tes dalam 19 file lulus. Lint dan build produksi juga dijalankan. Backend lulus unit test, go vet, dan integration suite penuh setelah perbaikan label metrics.

Worker frontend dibatasi dua pada pemeriksaan lokal karena startup Docker dan build bersamaan membuat mesin sibuk. Selector tes dengan 121 item diperbaiki agar tidak menghitung ulang accessible role seluruh daftar pada setiap halaman.

## Browser dan backend

Chrome memakai aplikasi frontend asli, PCM WAV 60 detik yang dibuat untuk pengujian, serta respons REST/WebSocket fixture terisolasi. Skenario yang lulus:

1. Putar lagu album: history terkirim setelah audio paused=false dan readyState=4.
2. Pause/resume tidak menambah history.
3. Next mengambil lagu antrean dan mengonfirmasi konsumsi setelah playing.
4. Respons audio 404 mempertahankan entri dan history; retry berhasil mengambil lease baru dan memutar lagu.
5. Queue kosong mengembalikan player ke lagu album berikutnya.
6. Replay lagu yang sama menghasilkan history baru.
7. Memilih kemunculan kedua dari dua entri lagu sama hanya mengonsumsi ID entri kedua.

Urutan history fixture: 1, 3, 4, 2, 2, 1. Entri yang dikonsumsi: 30, 40, 52; entri 51 tetap ada. Semua request history yang diperiksa memiliki audio paused=false dan readyState=4. Tidak ada uncaught page error.

Lebar main diperiksa pada 320, 375, 768, dan 1280 px; tidak ada overflow horizontal pada skenario antrean. Screenshot player gagal dan daftar antrean diperiksa secara visual. Browser ini memakai API fixture, bukan backend aktif.

Backend diuji terpisah melalui integration suite PostgreSQL dan Redis sungguhan dengan Testcontainers, termasuk reservasi bersamaan, expiry, isolasi user, exact entry deletion, dan endpoint lama. Docker Desktop dinyalakan untuk pemeriksaan ini.

## Gate UI untuk bagian yang berubah

- Hard Gate PASS: status Memuat antrean, error/retry, kontrol next dan pemilihan entri bekerja; request cepat dikunci dan pilihan manual tidak ditimpa respons terlambat.
- Purpose Gate PASS: mempertahankan DESIGN.md; status baru menjelaskan request antrean yang sedang berlangsung tanpa dekorasi baru.
- Liveliness PASS: ENERGY 1 / RHYTHM 1 / MOTION 1; fokus tetap pada kontrol playback dan daftar lagu.
- Quality PASS: tes otomatis, native audio Chrome, integration backend, dan screenshot digunakan untuk memverifikasi perilaku. Ini bukan audit seluruh aplikasi.

## Batasan

- Konfirmasi konsumsi dan pencatatan history merupakan dua request. Gangguan jaringan setelah konfirmasi dapat meninggalkan history yang belum tercatat; ada toast kegagalan dan tidak ada retry buta.
- Server mempercayai laporan client tentang mulai pemutaran. Ambang waktu mendengarkan dan pencegahan manipulasi chart belum ditambahkan.
- Lease 60 detik membatasi reservasi yang ditinggalkan client. Frontend menghentikan audio yang belum dimulai sebelum lease habis dan memerlukan pengambilan ulang.
- Pagination tetap berbasis offset dan tidak menjamin snapshot terhadap mutasi pengguna/perangkat lain.
- Peringatan bundle di atas 500 kB tetap ada; code splitting dijadwalkan pada Hari 8.
