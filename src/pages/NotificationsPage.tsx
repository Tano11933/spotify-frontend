import { useState } from 'react'
import { Link } from 'react-router'

import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { Button } from '@/components/ui/Button'
import { useAsync } from '@/hooks/useAsync'
import { getApiErrorMessage, notificationApi } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatRelativeTime } from '@/lib/format'
import { useNotificationStore } from '@/store/notificationStore'
import { useToastStore } from '@/store/toastStore'

/**
 * Daftar notifikasi in-app. Badge "Baru" menandai yang belum dibaca, dan
 * tombol "Tandai semua dibaca" hanya muncul saat masih ada yang belum dibaca.
 */
export function NotificationsPage() {
  const markAllRead = useNotificationStore((state) => state.markAllRead)
  const pushToast = useToastStore((state) => state.push)
  const [isMarking, setIsMarking] = useState(false)

  const { data, error, isLoading, reload } = useAsync(
    () => notificationApi.getMine({ limit: 50 }),
    [],
  )

  async function handleMarkAllRead() {
    setIsMarking(true)
    try {
      await markAllRead()
      // Muat ulang supaya tanda "Baru" ikut hilang dari daftar, bukan hanya
      // badge di lonceng.
      reload()
    } catch (markError) {
      pushToast({
        title: 'Gagal menandai notifikasi',
        description: getApiErrorMessage(markError),
        variant: 'error',
      })
    } finally {
      setIsMarking(false)
    }
  }

  if (isLoading) return <LoadingState label="Memuat notifikasi…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  return (
    <div className="pt-4">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-spotify-white md:text-5xl">Notifikasi</h1>
          <p className="mt-2 text-sm text-spotify-light-gray">
            {data.unread > 0 ? `${data.unread} belum dibaca` : 'Semua sudah dibaca'}
          </p>
        </div>

        {data.unread > 0 && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={isMarking}
            onClick={() => void handleMarkAllRead()}
          >
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {data.items.length === 0 ? (
        <EmptyState message="Belum ada notifikasi. Kabar pengikut baru akan muncul di sini." />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.items.map((notification) => (
            <li
              key={notification.id}
              className={cn(
                'flex items-center gap-4 rounded-xl border px-4 py-3',
                notification.read_at
                  ? 'border-white/[0.06] bg-spotify-dark-gray'
                  : 'border-spotify-green/30 bg-spotify-elevated',
              )}
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-spotify-green text-sm font-bold text-spotify-black-pure"
              >
                {notification.actor?.name.charAt(0).toUpperCase() ?? '?'}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-spotify-white">
                  {notification.actor ? (
                    <Link
                      to={`/users/${notification.actor.id}`}
                      className="font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-white"
                    >
                      {notification.actor.name}
                    </Link>
                  ) : (
                    'Seseorang'
                  )}{' '}
                  mulai mengikuti kamu.
                </p>
                <p className="mt-1 text-xs text-spotify-light-gray">
                  {formatRelativeTime(notification.created_at)}
                </p>
              </div>

              {!notification.read_at && (
                <span className="shrink-0 rounded-full bg-spotify-green px-2 py-0.5 text-[10px] font-bold text-spotify-black-pure">
                  Baru
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
