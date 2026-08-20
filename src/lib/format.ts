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
  return Number.isNaN(date.getTime()) ? '—' : String(date.getFullYear())
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
