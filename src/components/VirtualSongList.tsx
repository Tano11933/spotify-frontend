import { SongRow } from '@/components/SongRow'
import { SONG_ROW_HEIGHT, useVirtualList } from '@/hooks/useVirtualList'
import { cn } from '@/lib/cn'
import type { Song } from '@/types'

interface VirtualSongListProps {
  songs: Song[]
  /** Tinggi area gulir; default 32rem (sekitar 8 baris terlihat). */
  heightClass?: string
  /** Sembunyikan kolom artist saat semua lagu milik artist yang sama. */
  showArtist?: boolean
  /** Isi kolom kanan baris; chart memakai jumlah putar. */
  trailing?: (song: Song) => string
}

/**
 * Daftar lagu yang hanya merender baris di sekitar viewport.
 *
 * Dipakai untuk daftar panjang yang dimuat sekaligus (seluruh lagu artist,
 * chart) supaya DOM tidak menampung ratusan baris. Daftar yang sudah
 * dipaginasi (maks 24 baris per halaman) tidak perlu ini.
 *
 * Aksesibilitas:
 *   - container dibuat fokusabel (tabIndex 0) supaya pengguna keyboard bisa
 *     menggulirnya dengan panah/Page Down lalu men-Tab baris yang tampil;
 *   - tiap item membawa aria-setsize/aria-posinset supaya screen reader tahu
 *     posisinya di daftar penuh, bukan cuma yang ter-render;
 *   - queue pemutaran tetap daftar UTUH, bukan hanya yang ter-render.
 */
export function VirtualSongList({
  songs,
  heightClass = 'h-[32rem]',
  showArtist = true,
  trailing,
}: VirtualSongListProps) {
  const { containerRef, onScroll, start, end, offsetY, totalHeight } = useVirtualList(
    songs.length,
    SONG_ROW_HEIGHT,
  )

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      tabIndex={0}
      role="region"
      aria-label="Daftar lagu, bisa digulir"
      className={cn(
        heightClass,
        'overflow-y-auto rounded-lg border border-white/[0.06]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
      )}
    >
      <div style={{ height: totalHeight }}>
        <ul role="list" style={{ transform: `translateY(${offsetY}px)` }} className="flex flex-col">
          {songs.slice(start, end).map((song, index) => {
            const absoluteIndex = start + index

            return (
              <li
                key={song.id}
                role="listitem"
                aria-setsize={songs.length}
                aria-posinset={absoluteIndex + 1}
                style={{ height: SONG_ROW_HEIGHT }}
              >
                <SongRow
                  song={song}
                  index={absoluteIndex}
                  queue={songs}
                  showArtist={showArtist}
                  trailing={trailing?.(song)}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
