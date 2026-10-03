import { Link } from 'react-router'

import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { feedApi } from '@/lib/api'
import { formatRelativeTime } from '@/lib/format'
import { usePlayerStore } from '@/store/playerStore'
import type { FeedEntry } from '@/types'

/**
 * Feed aktivitas user yang diikuti. Isinya dirakit backend (read-time join ke
 * `user_follows`), jadi halaman ini cukup menampilkan; playlist pribadi tidak
 * pernah ikut tercatat.
 */
export function FeedPage() {
  const { data, error, isLoading, reload } = useAsync(() => feedApi.getFeed({ limit: 50 }), [])

  if (isLoading) return <LoadingState label="Memuat feed…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  return (
    <div className="pt-4">
      <h1 className="text-3xl font-bold text-spotify-white md:text-5xl">Feed</h1>
      <p className="mt-2 mb-8 text-sm text-spotify-light-gray">
        Aktivitas dari orang yang kamu ikuti.
      </p>

      {data.items.length === 0 ? (
        <EmptyState message="Feed masih kosong. Ikuti user lain lewat tautan pemilik di playlist publik supaya aktivitas mereka muncul di sini." />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((entry) => (
            <FeedItem key={feedKey(entry)} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Backend tidak mengirim id entri feed, jadi kunci dirakit dari isinya. */
function feedKey(entry: FeedEntry): string {
  const objectID = entry.song?.id ?? entry.playlist?.id ?? 'unknown'
  return `${entry.type}-${entry.user.id}-${objectID}-${entry.created_at}`
}

function FeedItem({ entry }: { entry: FeedEntry }) {
  const play = usePlayerStore((state) => state.play)
  const song = entry.song

  return (
    <li className="flex gap-4 rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-4">
      <Link
        to={`/users/${entry.user.id}`}
        aria-label={`Profil ${entry.user.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-spotify-green text-sm font-bold text-spotify-black-pure focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
      >
        {entry.user.name.charAt(0).toUpperCase()}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-spotify-white">
          <Link
            to={`/users/${entry.user.id}`}
            className="font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
          >
            {entry.user.name}
          </Link>{' '}
          {entry.type === 'song_played' ? 'memutar lagu' : 'membuat playlist'}
        </p>

        {song && (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => play(song, [song])}
              aria-label={`Putar ${song.title}`}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-spotify-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
            >
              {song.album?.cover_url ? (
                <img src={song.album.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-spotify-light-gray">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" />
                  </svg>
                </span>
              )}

              {/* Ikon play selalu tampak, bukan hover-only: di layar sentuh
                  tidak ada hover, dan cover ini adalah tombolnya. */}
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center bg-black/30 text-spotify-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 translate-x-[1px]">
                  <path d="M8 5.14v13.72a.5.5 0 0 0 .77.42l10.29-6.86a.5.5 0 0 0 0-.84L8.77 4.72a.5.5 0 0 0-.77.42Z" />
                </svg>
              </span>
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-spotify-white">{song.title}</p>
              <Link
                to={`/artists/${song.artist_id}`}
                className="block truncate text-xs text-spotify-light-gray hover:text-spotify-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
              >
                {song.artist?.name ?? 'Artis tidak diketahui'}
              </Link>
            </div>
          </div>
        )}

        {entry.playlist && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-spotify-white">{entry.playlist.name}</p>
            {entry.playlist.description && (
              <p className="mt-1 line-clamp-2 text-xs text-spotify-light-gray">
                {entry.playlist.description}
              </p>
            )}
          </div>
        )}

        <p className="mt-2 text-xs text-spotify-light-gray">{formatRelativeTime(entry.created_at)}</p>
      </div>
    </li>
  )
}
