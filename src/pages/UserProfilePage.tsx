import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { FollowUserButton } from '@/components/FollowUserButton'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { usersApi } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'
import type { Playlist, PublicUser } from '@/types'

type ProfileTab = 'playlists' | 'followers' | 'following'

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: 'playlists', label: 'Playlist publik' },
  { id: 'followers', label: 'Pengikut' },
  { id: 'following', label: 'Mengikuti' },
]

/** Bentuk data per tab, discriminated union supaya tipe bisa dipersempit. */
type ProfileTabData =
  | { tab: 'playlists'; playlists: Playlist[] }
  | { tab: 'followers'; users: PublicUser[] }
  | { tab: 'following'; users: PublicUser[] }

/**
 * Profil publik user: identitas, statistik sosial, tombol Ikuti, dan tiga tab
 * (playlist publik, pengikut, mengikuti). Semua daftarnya publik; tombol Ikuti
 * hanya muncul untuk user yang login.
 */
export function UserProfilePage() {
  const { id = '' } = useParams<{ id: string }>()
  const status = useAuthStore((state) => state.status)
  const currentUser = useAuthStore((state) => state.user)
  const [tab, setTab] = useState<ProfileTab>('playlists')

  // Tunggu bootstrap sesi selesai sebelum memuat profil. `is_following`
  // bergantung pada token, dan request yang berangkat sebelum refresh token
  // selesai akan dijawab backend seolah-olah request anonim.
  const isAuthPending = status === 'idle' || status === 'bootstrapping'

  const profileState = useAsync(
    () => (isAuthPending ? Promise.resolve(null) : usersApi.getProfile(id)),
    [id, status],
  )

  const tabState = useAsync<ProfileTabData>(
    () => {
      if (tab === 'followers') {
        return usersApi
          .getFollowers(id, { limit: 100 })
          .then((page) => ({ tab: 'followers' as const, users: page.items }))
      }
      if (tab === 'following') {
        return usersApi
          .getFollowing(id, { limit: 100 })
          .then((page) => ({ tab: 'following' as const, users: page.items }))
      }
      return usersApi
        .getPlaylists(id, { limit: 100 })
        .then((page) => ({ tab: 'playlists' as const, playlists: page.items }))
    },
    [id, tab],
  )

  if (isAuthPending || profileState.isLoading) return <LoadingState label="Memuat profil…" />
  if (profileState.error) {
    return <ErrorState message={profileState.error} onRetry={profileState.reload} />
  }

  const profile = profileState.data
  if (!profile) return null

  const isSelf = currentUser?.id === profile.id

  return (
    <div className="pt-4">
      <header className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
        <span
          aria-hidden="true"
          className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-spotify-elevated text-5xl font-bold text-spotify-white md:h-40 md:w-40 md:text-6xl"
        >
          {profile.name.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-medium tracking-wide text-spotify-light-gray uppercase">Profil</p>
          <h1 className="mt-2 text-3xl font-bold break-words text-spotify-white md:text-5xl">
            {profile.name}
          </h1>

          <p className="mt-3 text-sm text-spotify-light-gray">
            {profile.followers} pengikut
            <span aria-hidden="true"> • </span>
            {profile.following} mengikuti
            <span aria-hidden="true"> • </span>
            {profile.public_playlists} playlist publik
          </p>

          {!isSelf && (
            <div className="mt-5">
              <FollowUserButton userId={profile.id} isFollowing={profile.is_following} />
            </div>
          )}
        </div>
      </header>

      <div role="tablist" aria-label="Bagian profil" className="mt-8 mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-full px-4 py-3 text-sm font-semibold transition-colors sm:py-2',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white',
              tab === item.id
                ? 'bg-spotify-green text-spotify-black-pure'
                : 'bg-spotify-elevated text-spotify-light-gray hover:text-spotify-white',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tabState.isLoading && <LoadingState label="Memuat daftar…" />}
      {tabState.error && <ErrorState message={tabState.error} onRetry={tabState.reload} />}

      {tabState.data?.tab === 'playlists' &&
        (tabState.data.playlists.length === 0 ? (
          <EmptyState message="Belum ada playlist publik di profil ini." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {tabState.data.playlists.map((playlist) => (
              <li
                key={playlist.id}
                className="rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-4"
              >
                <p className="truncate text-sm font-bold text-spotify-white">{playlist.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-spotify-light-gray">
                  {playlist.description || 'Tanpa deskripsi'}
                </p>
              </li>
            ))}
          </ul>
        ))}

      {tabState.data?.tab === 'followers' &&
        (tabState.data.users.length === 0 ? (
          <EmptyState message="Belum ada pengikut." />
        ) : (
          <UserList users={tabState.data.users} />
        ))}

      {tabState.data?.tab === 'following' &&
        (tabState.data.users.length === 0 ? (
          <EmptyState message="Belum mengikuti siapa pun." />
        ) : (
          <UserList users={tabState.data.users} />
        ))}
    </div>
  )
}

/** Daftar user yang bisa diklik menuju profil masing-masing. */
function UserList({ users }: { users: PublicUser[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {users.map((user) => (
        <li key={user.id}>
          <Link
            to={`/users/${user.id}`}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-spotify-dark-gray p-4 transition-colors hover:border-white/10 hover:bg-spotify-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-spotify-green text-sm font-bold text-spotify-black-pure"
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="truncate text-sm font-semibold text-spotify-white">{user.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
