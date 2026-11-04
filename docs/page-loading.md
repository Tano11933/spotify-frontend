# Pemuatan halaman dan pemulihan error

`App.tsx` memakai dynamic import untuk setiap halaman. `PageRoute` menempatkan `Suspense` dan error boundary di sekitar halaman tersebut. `AppLayout`, hook sinkronisasi/realtime/antrean, serta `NowPlayingBar` berada di luar boundary halaman, sehingga navigasi antarrute katalog tidak melepas elemen audio.

`ProtectedRoute` dan `GuestOnlyRoute` tetap menentukan akses sebelum merender halaman lazy. Guest yang membuka `/admin` diarahkan ke login sebelum chunk admin diminta. Pemeriksaan role admin tetap dilakukan oleh halaman admin dan otorisasi backend.

## Loading dan error

- Dynamic import yang belum selesai menampilkan status `Memuat halaman…` di area konten. Player tetap tersedia.
- Promise import ditolak atau halaman gagal saat render: tampil `Halaman tidak dapat dibuka`, dengan fokus pada tombol retry. Detail exception tidak ditampilkan kepada pengguna.
- **Coba lagi** memasang ulang boundary dan konten halaman. Instance `React.lazy` baru membuat loader dipanggil kembali, sehingga rejection yang disimpan React tidak mengunci halaman selamanya. State lokal halaman, termasuk formulir yang belum disimpan, dibuat ulang.
- **Ke beranda** melakukan navigasi router ke `/`. Pada layout katalog, audio tetap berjalan.
- **Muat ulang aplikasi** memuat ulang dokumen pada URL saat ini. Ini juga memuat ulang modul yang sudah gagal evaluasi dan tersimpan di cache modul browser. Audio berhenti; konsekuensi tersebut ditulis di UI. Posisi akun mengikuti mekanisme restore player yang sudah ada.
- Navigasi dengan `location.key` baru, termasuk perubahan query di route yang sama, membuat boundary baru. Error halaman sebelumnya tidak menutupi halaman berikutnya.

Kegagalan request API yang sudah ditangani halaman tetap memakai `ErrorState` dan retry request milik halaman. Boundary ini menangani import/render halaman, bukan error di layout/player, event handler, atau promise di luar proses render. Import yang terus gagal karena offline/deployment yang belum lengkap masih memerlukan perbaikan koneksi/deployment. Modul yang berhasil dimuat tetapi selalu melempar saat render dapat tetap gagal setelah retry; tombol beranda dan reload menyediakan jalur pemulihan yang berbeda.

## Deployment chunk

Server harus menyediakan fallback SPA untuk URL halaman, serta menyajikan berkas JS/CSS pada URL asetnya. Upload aset build baru sebelum mengganti `index.html`. Pertahankan aset build sebelumnya selama masih ada tab yang menggunakannya; menghapus chunk lama langsung setelah deploy dapat membuat tab lama gagal membuka halaman berikutnya. Reload mengambil entry build baru. Jangan mengembalikan HTML dengan status 200 untuk chunk JS yang hilang.

## Ukuran JS

Perbandingan build lokal pada 4 November 2026, dengan versi dependency dan konfigurasi build yang sama. Satuan kB desimal; gzip dihitung per berkas. CSS, font, respons API, dan audio berada di luar angka berikut.

| Yang diukur | Sebelum | Sesudah |
|---|---:|---:|
| Entry JS | 552,45 kB | 391,66 kB |
| Entry JS gzip | 167,68 kB | 122,53 kB |
| JS beranda guest pada cache browser kosong | 552,45 kB / 1 berkas | 417,09 kB / 10 berkas |
| Gzip berkas JS beranda, dijumlahkan | 167,68 kB | 133,14 kB |

Admin menjadi chunk tersendiri sekitar 18,40 kB (5,04 kB gzip). Chunk halaman auth dan schema form juga tidak diminta ketika pertama membuka beranda. Angka beranda sesudah berasal dari daftar request JS Chrome pada build produksi dengan API fixture lokal. Ini pengukuran ukuran aset yang diperlukan, bukan benchmark waktu muat atau hasil kompresi transfer HTTP server.

Untuk mengukur ulang, jalankan `npm run build`, lalu `npm run preview -- --host 127.0.0.1 --port 5174 --strictPort`. Buka beranda dengan cache browser kosong, filter request `.js` di Network, dan jumlahkan ukuran berkas yang diminta. Angka entry saja tidak mencakup shared chunk dan chunk beranda. Hentikan preview setelah selesai.

## Akses keyboard

Admin menggunakan kelompok tombol kategori dengan `aria-pressed`, sehingga pilihan tidak hanya ditunjukkan oleh warna. Tombol Edit/Hapus menyebut jenis serta nama record. Edit memfokuskan input pertama; Batal mengembalikan fokus ke tombol Edit asal. Feedback gagal diumumkan sebagai alert, dan sukses sebagai status.

Slider posisi player menjelaskan waktu saat ini dan durasi, sedangkan volume menjelaskan persentase. Keduanya mempertahankan kontrol keyboard native. Area slider dan tautan antrean minimal 44 px; bar dapat bertambah tinggi agar kontrol tetap muat.

Tampilan pemulihan mengikuti `DESIGN.md`: latar gelap, Inter, satu tombol hijau sebagai aksi utama, dan aksi sekunder berbingkai/tautan. ENERGY 1 / RHYTHM 1 / MOTION 1 untuk keadaan pemulihan: judul sebagai fokus, jarak memisahkan penjelasan dan tindakan, tanpa animasi dekoratif. Pola Melodia yang sudah ada memberi konteks melalui sidebar, player, dan aksen hijau.

## Verifikasi

`npm test`, `npm run lint`, dan `npm run build` dijalankan untuk perubahan ini. Test routing mencakup lazy import tertunda/ditolak, retry render, perpindahan query, error request yang sudah ditangani, guard auth, serta kontinuitas elemen audio. Test admin/player mencakup perubahan fokus dan nilai aksesibel.

Pemeriksaan Chrome terhadap build produksi memakai respons API fixture dan audio WAV sintetis lokal. Audio benar-benar diputar dan diperiksa lewat `paused`, `currentTime`, dan identitas elemen. Pemuatan chunk ditunda/digagalkan secara sengaja, dan render error diinjeksi ke modul fixture untuk menguji fallback/retry/reload. Empat editor admin diuji dengan Enter, Shift+Tab, dan pembatalan. Layout admin dan pemulihan diperiksa pada lebar 320, 390, dan 1440 px. Pengujian ini memverifikasi perilaku frontend; integrasi browser dengan backend nyata disiapkan pada tahap E2E roadmap.
