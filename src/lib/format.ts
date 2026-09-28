/**
 * Mengubah durasi dalam DETIK (bentuk yang dikirim backend) menjadi "m:ss".
 *
 * padStart pada bagian detik itu wajib: tanpa itu, 125 detik tampil sebagai
 * "2:5" alih-alih "2:05".
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Mengambil tahun dari timestamp RFC3339 milik backend. */
export function formatYear(isoDate: string): string {
  const date = new Date(isoDate)
  return Number.isNaN(date.getTime()) ? '-' : String(date.getFullYear())
}

/**
 * Waktu relatif untuk riwayat putar: "baru saja", "12 menit lalu", "3 jam lalu".
 * Lebih mudah dibaca sekilas daripada timestamp penuh di dalam daftar.
 */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'Waktu tidak diketahui'

  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (diffSeconds < 60) return 'baru saja'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} menit lalu`
  if (diffSeconds < 86_400) return `${Math.floor(diffSeconds / 3600)} jam lalu`
  return `${Math.floor(diffSeconds / 86_400)} hari lalu`
}

/**
 * Salam sesuai waktu setempat — sapaan khas halaman depan Spotify.
 */
export function greetingForHour(hour: number = new Date().getHours()): string {
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}
