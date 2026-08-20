/**
 * Menggabungkan class Tailwind secara kondisional.
 *
 * Versi mungil dari library `clsx`. Sengaja tidak menambah dependensi untuk
 * sesuatu sesingkat ini — nilai false/null/undefined dibuang, sisanya
 * disambung dengan spasi.
 *
 *   cn('px-4', isActive && 'text-spotify-green', error && 'border-red-500')
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
