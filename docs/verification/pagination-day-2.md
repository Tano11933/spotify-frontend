# Verifikasi pagination: Hari 2

Tanggal: 24 Oktober 2026. Perubahan implementasi berada di frontend; tidak ada perubahan kontrak atau kode backend.

## Hasil perubahan

- Daftar playlist pribadi dan publik memiliki pagination, loading, error, dan retry masing-masing.
- Katalog pemilih lagu dimuat ketika playlist milik user dipilih dan dapat dilanjutkan melewati item ke-100.
- Pilihan lagu yang sudah ada dalam playlist disaring dari opsi, tanpa mengubah offset katalog.
- Kepemilikan ditentukan oleh user_id, bukan keberadaan playlist dalam halaman daftar pribadi yang sedang dimuat.
- Antrean memuat halaman berikutnya tanpa menghilangkan lagu yang sengaja berulang.
- Refresh setelah mutasi mengambil ulang rentang yang sudah dimuat, dengan ukuran request 24 item. Ini menghindari offset yang melewatkan item setelah penghapusan lokal.
- Refresh mengganti snapshot daftar hanya setelah seluruh rentang berhasil. Jika gagal, snapshot sebelumnya dipertahankan dengan pesan bahwa daftar belum diperbarui dan aksi retry.
- Klik loadMore dalam frame yang sama dikunci agar tidak mengirim request halaman yang sama dua kali. Respons dari sumber data lama diabaikan setelah dependensi berubah atau hook dilepas.

## Tes otomatis

Jalankan dari root frontend:

```sh
npm test
npm run lint
npm run build
```

104 tes dalam 18 file lulus pada pemeriksaan lengkap. Lint dan build produksi lulus. Peringatan chunk JavaScript di atas 500 kB masih ada dan bukan bagian optimasi Hari 2.

Tambahan tes:

- usePagedList: refresh beberapa halaman, kegagalan halaman refresh berikutnya, request loadMore ganda, dan pembatalan refresh saat sumber berubah.
- PlaylistsPage: 121 playlist pribadi/publik, pemuatan independen, error halaman awal/lanjutan, penghapusan setelah beberapa halaman, create publik di kedua daftar, ownership, dan lagu ke-101.
- PlaylistSongPicker: semua lagu halaman saat ini sudah dipilih, error/retry halaman berikutnya, serta mempertahankan pilihan ketika penambahan gagal.
- QueuePage: 121 entri, urutan konteks pemutaran, lagu berulang lintas halaman, penghapusan kemunculan pertama, refresh gagal/retry, mutasi gagal, dan penghapusan item terakhir.

Satu percobaan suite lengkap melewati timeout 5 detik pada tes 121 playlist. Selector tes diperbaiki agar tidak menghitung ulang accessible role seluruh daftar pada setiap iterasi; pengulangan suite lengkap lulus tanpa memperbesar timeout global.

## Browser Chrome

Aplikasi frontend asli dijalankan melalui Vite; respons REST dan WebSocket diisolasi sebagai fixture. Data menggunakan 121 playlist pribadi, 121 playlist publik, 121 lagu katalog, dan antrean dengan lagu yang sengaja berulang. Tidak ada akun atau katalog produksi yang diubah.

Skenario yang lulus:

1. Kedua daftar playlist mencapai halaman terakhir secara independen. Katalog tidak dimuat sebelum playlist milik pengguna dipilih.
2. Hapus playlist setelah 48 item dimuat mempertahankan kedalaman dan mengambil item pengganti yang bergeser. Item berikutnya tidak terlewat.
3. Lagu ke-101 dapat dipilih, ditambahkan, lalu dihapus. Pilihan dibersihkan setelah sukses dan lagu yang dihapus dapat dipilih lagi.
4. Playlist publik baru muncul satu kali di daftar pribadi maupun publik.
5. Request halaman antrean yang gagal dapat dicoba ulang tanpa menghilangkan entri sebelumnya.
6. Dua kemunculan lagu yang sama tetap terlihat. Penghapusan hanya mengurangi kemunculan pertama sesuai kontrak server sekarang.
7. Refresh gagal sesudah hapus menampilkan pesan dan menonaktifkan hapus berikutnya sampai daftar diperbarui. Retry dengan keyboard Enter berhasil.
8. Antrean mencapai halaman terakhir setelah mutasi tanpa duplikasi akibat akumulasi halaman.

Tidak ada uncaught page error. Lebar dokumen dan area main diperiksa pada 320, 375, 768, 1024, dan 1280 px; tidak ada overflow horizontal pada area tersebut. Screenshot halaman playlist mobile dan antrean desktop/mobile diperiksa secara visual.

## Gate UI pada bagian yang berubah

- Hard Gate PASS: loading/empty/error/retry tersedia, kontrol memuat dan mutasi bekerja, keyboard retry berhasil, dan halaman diuji lintas lebar layar.
- Purpose Gate PASS: warna, tipografi, dan struktur mengikuti DESIGN.md. Section pribadi/publik dipisah karena sumber dan status request berbeda; tombol Muat lagi berada pada daftar yang dikendalikannya.
- Liveliness PASS: ENERGY 1 / RHYTHM 1 / MOTION 1; hierarki daftar, form, dan detail mengikuti tugas pengguna. Tidak menambah animasi dekoratif atau statistik contoh ke produk.
- Quality PASS: tes lengkap, lint, build, browser fixture, dan inspeksi screenshot selesai. Gate ini tidak menyatakan audit seluruh aplikasi.

## Batasan

- Pemeriksaan browser memakai API fixture, bukan PostgreSQL/Redis/backend aktif. Integration suite backend tidak dijalankan karena implementasi backend tidak berubah.
- Offset pagination tidak menjamin snapshot global jika pengguna lain mengubah daftar pada saat yang sama. Refresh di sini menjaga konsistensi mutasi lokal yang diketahui frontend.
- Detail playlist masih menerima semua lagu melalui endpoint detail. Pekerjaan ini memaginasi daftar playlist dan katalog pemilih lagu, bukan membuat endpoint baru untuk isi playlist.
- Next masih menggunakan konteks lagu yang sudah dimuat. Integrasi antrean akun dengan kontrol player dijadwalkan pada Hari 3.
