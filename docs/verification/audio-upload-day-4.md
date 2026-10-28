# Verifikasi upload audio, Hari 4

Tanggal: 28 Oktober 2026. Perubahan mencakup multipart client bertipe,
progress, AbortSignal, editor audio admin, validasi awal, retry, dan pemutaran
hasil melalui player aplikasi.

## Cara pakai

1. Masuk sebagai admin, buka Admin, lalu tab Lagu.
2. Buat metadata lagu jika belum tersedia, kemudian pilih Edit pada lagunya.
3. Pilih MP3 atau WAV PCM 8/16-bit mono/stereo, maksimal 20 MiB, lalu Unggah audio.
4. Tunggu pesan berhasil, kemudian Putar hasil unggah.

Format dan ukuran juga diperiksa backend. Kontrak baru menolak OGG/M4A/AAC
untuk upload; file lama masih dapat di-stream. WAV float/extensible dan MP3
free-format tidak didukung. Validasi MP3 memeriksa framing tanpa decoding penuh.
Durasi metadata katalog tidak dihitung ulang oleh proses upload.

Saat 100%, pengiriman selesai tetapi validasi/penyimpanan belum tentu selesai.
Pembatalan meng-abort request, bukan rollback server. Response lama setelah
pembatalan, ganti editor, atau unmount tidak memperbarui state editor baru.
Request upload memakai timeout 120 detik dan tetap melalui auth interceptor.

## Bukti browser

Chrome headless memakai UI frontend dan aplikasi backend nyata pada port
sementara, dengan PostgreSQL 16 serta Redis 7 dari testcontainers. Request API
diteruskan melalui proxy Playwright ke backend; response upload dan stream tidak
dipalsukan. WebSocket memakai ack fixture karena transport realtime bukan
lingkup verifikasi ini. Akun dan katalog merupakan fixture test terisolasi.

Audio WAV sinus 440/660 Hz dibuat sendiri di memori, tanpa unduhan media:

- Upload pertama: audio native `paused=false`, `readyState=4`, durasi 30 detik.
- Penggantian: audio native `paused=false`, `readyState=4`, durasi 20 detik.
- Byte stream penuh sesuai WAV pertama; Range 40–99 sesuai WAV pengganti (206).
- File kosong ditolak lokal; MP3 palsu ditolak backend dan pesannya terlihat.
- Request yang ditahan dapat dibatalkan, kemudian file dapat diunggah ulang.
- Semua request upload memakai boundary multipart dari browser.
- Pemilihan file dan tombol upload dapat dijangkau dengan keyboard.
- Lebar 320/375/768/1280 px: scrollWidth area upload dan main tidak melampaui
  clientWidth; screenshot mobile diperiksa secara visual.
- Tidak ada pageerror JavaScript selama perjalanan tersebut.

Pengujian memakai output audio browser, bukan pemeriksaan pendengaran manusia.
Tidak mengklaim seluruh decoder/browser atau perangkat fisik sudah diuji.
Progress persentase dan tahap validasi setelah 100% juga diuji pada component test.

## Keputusan UI

Form upload mengikuti DESIGN.md, ENERGY 1 / RHYTHM 1 / MOTION 1. Tema gelap,
Inter, dan hijau tetap mengikuti identitas proyek Spotify clone. Border atas
memisahkan penyimpanan metadata dari upload file karena keduanya request berbeda.
Tombol membungkus pada layar sempit dengan target tinggi minimal 44 px. Pesan
status memakai teks dan live region; kegagalan tidak mengandalkan warna.
Tidak ada aset, ikon, animasi, navigasi, atau kartu baru.

## Pemeriksaan otomatis

```powershell
npm test -- --maxWorkers=1
npm run lint
npm run build
```

Test baru mencakup API multipart/boundary/signal/progress/error, editor admin,
file kosong/format/ukuran, sukses, gagal/retry, batal, response terlambat,
abort saat unmount, dan pemutaran objek Song hasil upload.

Hasil final frontend: 128 test dalam 22 file lulus; lint dan build lulus.
Bundle JS utama 541,53 kB (164,62 kB gzip), masih memberi peringatan >500 kB.
Pemisahan bundle tetap dalam rencana Hari 8.

Backend menjalankan unit test, vet, dan integration suite. Integration test
memeriksa otorisasi, isi audio, ukuran aktual meskipun deklarasi lebih kecil,
penggantian bersamaan, preservasi file lama saat gagal, cleanup, dan Range.

Hasil backend final: `go test ./...` dan `go vet ./...` lulus; seluruh integration
suite lulus dalam 17,127 detik pada PostgreSQL/Redis nyata.

## Cleanup

TestMain diperbaiki agar defer berjalan sebelum os.Exit. Hub, koneksi SQL/Redis,
file sementara, serta container test ditutup setelah test selesai, termasuk saat
test gagal. Server Vite, Chrome test, dan Docker Desktop yang dinyalakan untuk
verifikasi dihentikan sesudah seluruh pemeriksaan. Proses aplikasi pengguna
yang tidak terkait tidak ikut dihentikan.

Docker Desktop sempat gagal startup karena socket runtime kosong yang tidak
bisa diakses. Direktori socket disimpan sebagai backup `run-stale-20261028*`
di AppData/Local/Docker dan `docker-secrets-engine-stale-20261028*` di
AppData/Local; image, volume dan database tidak di-reset. Backup hanya berisi
socket kosong, bukan data aplikasi. Masalah runtime Docker ini terpisah dari
fitur upload.

## Delivery Gate antislop (lingkup UI upload baru)

- R-02 PASS: teks komponen diperiksa; tidak ada em dash.
- R-03 PASS: main dan area upload tidak overflow pada 320/375/768/1280 px.
- R-17 PASS: batas 20 MiB sesuai konstanta klien dan default server.
- R-18 PASS: tidak menambahkan testimonial.
- R-23 PASS: tidak membuat aset visual atau navigasi baru.
- R-24 PASS: tidak menambahkan link navigasi.
- R-25 PASS: checker menghasilkan putih/dark-gray 17,76:1, light-gray/dark-gray
  8,47:1 dan hitam/hijau 8,12:1; border input memakai light-gray yang sama.
- R-26 PASS: pilih file, unggah, batal, retry, dan putar memiliki perilaku nyata;
  component test dan Chrome menjalankannya.
- R-27 PASS: tanpa file menonaktifkan upload; loading, error dan sukses diuji.
- R-28 PASS: tidak menambahkan FAQ.
- R-32 PASS: label terhubung, focus outline tersedia; file/unggah diuji keyboard.
- R-33 PASS: perubahan ditulis di source React/TypeScript.
- R-34 PASS: mengikuti tema tunggal proyek, tanpa toggle tema baru.
- R-35 PASS: app dijalankan, kontrol diuji di Chrome, screenshot diperiksa,
  build lulus dan tidak ada pageerror.
- R-36 PASS: pesan status menyatakan kondisi request, termasuk batas pembatalan.
- R-37 PASS: DESIGN.md digunakan dengan dial 1/1/1.
- R-38 PASS: fixture disebut sebagai fixture; tidak ada klaim pengguna produksi.
- R-01 PASS: hijau mengikuti identitas proyek, tanpa gradient baru.
- R-04 PASS: tidak menambahkan ikon.
- R-06 PASS: Inter mengikuti DESIGN.md agar konsisten dengan katalog.
- R-07 PASS: tidak menambahkan pola background.
- R-08 PASS: tidak menambahkan panah dekoratif.
- R-09 PASS: tidak menambahkan badge.
- R-10 PASS: tidak menambahkan blur/glass.
- R-12 PASS: area upload tidak memakai shadow baru.
- R-13 PASS: tidak menambahkan glow.
- R-14 PASS: form upload mengikuti kebutuhan editor, tanpa feature card.
- R-19 PASS: tidak menambahkan animasi; native progress menjelaskan pengiriman.
- R-22 PASS: tidak menambahkan ilustrasi.
- Liveliness/dial PASS: ENERGY/RHYTHM/MOTION 1/1/1 konsisten dengan form admin.
- Liveliness/fokus PASS: Unggah audio menjadi aksi utama pada area upload.
- Liveliness/spacing PASS: border dan pt-5 memisahkan metadata dari upload.
- Liveliness/aksen PASS: hijau menandai tombol utama dan progress.
- Liveliness/identitas PASS: dark theme, Inter dan tombol mengikuti DESIGN.md.
- Liveliness/design read PASS: arah form admin dinyatakan selama pengerjaan.
- C-1 PASS: alasan warna, layout, teks dan spacing tercatat di Keputusan UI.
- C-2 PASS: seluruh kontrol baru memiliki handler dan test perilaku.
- C-3 PASS: bagian upload tersedia hanya setelah lagu punya ID server.
- C-4 PASS: state error/retry/batal/unmount diuji; tombol membungkus di mobile.
- C-5 PASS: hasil pengujian berasal dari log dan browser-results.json.
- R-05 PASS: struktur mengikuti editor lagu, tanpa section template baru.
- R-11 PASS: input rounded-md dan tombol rounded-full mengikuti komponen proyek.
- R-15 PASS: CTA menyebut Unggah audio, Batalkan unggahan dan Putar hasil unggah.
- R-16 PASS: tidak ada klaim pemasaran atau buzzword pada komponen baru.
- R-20 PASS: kontrol menyatu dengan identitas katalog musik proyek.
- R-21 PASS: dark theme mengikuti DESIGN.md proyek Spotify clone.
- R-29 PASS: hanya netral dan aksen hijau dari token proyek.
- R-30 PASS: mengikuti arah Spotify clone yang sudah ditetapkan proyek.
- R-31 PASS: alasan keputusan utama dicatat, tanpa aset/dekorasi baru.

Human/layout supplement: label dan live region dipakai; border/focus terlihat,
kontrol baru bertinggi minimal 44 px dan tombol flex-wrap. Pemeriksaan layout
dilakukan di Chrome desktop pada viewport sempit; keyboard layar ponsel fisik
dan seluruh fitur admin lama belum diaudit pada tahap ini.
