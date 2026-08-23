import { Navigate, Outlet } from 'react-router'

import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'

export function GuestOnlyRoute() {
  const status = useAuthStore((state) => state.status)

  if (status === 'idle' || status === 'bootstrapping') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-spotify-black">
        <Spinner className="h-8 w-8 text-spotify-light-gray" />
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
