import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'
import { useAsync } from '@/hooks/useAsync'
import { authApi, getApiErrorMessage } from '@/lib/api'
import { authSession } from '@/lib/authSession'
import { useAuthStore } from '@/store/authStore'
import type { LoginSession } from '@/types'

function deviceName(agent: string) {
  const browser = /Edg\//.test(agent) ? 'Edge' : /OPR\//.test(agent) ? 'Opera'
    : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome'
      : /Safari\//.test(agent) ? 'Safari' : null
  if (!browser) return agent || 'Browser tidak diketahui'
  const system = /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS'
    : /Windows/.test(agent) ? 'Windows' : /Macintosh|Mac OS X/.test(agent) ? 'macOS'
      : /Linux/.test(agent) ? 'Linux' : null
  return system ? `${browser} di ${system}` : browser
}

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Tidak tersedia' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export function SessionsPage() {
  const userId = useAuthStore((state) => state.user?.id)
  const clearSession = useAuthStore((state) => state.clearSession)
  const { data, error, isLoading, reload } = useAsync(() => authApi.getSessions(), [userId])
  const [confirmation, setConfirmation] = useState<LoginSession | 'all' | null>(null)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const operation = useRef<symbol | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const confirmationId = useId()
  const navigate = useNavigate()

  useEffect(() => {
    setConfirmation(null)
    setPending(false)
    setActionError(null)
    setMessage(null)
    return () => { operation.current = null }
  }, [userId])

  useEffect(() => {
    if (confirmation) document.getElementById(`${confirmationId}-cancel`)?.focus()
  }, [confirmation, confirmationId])

  function ask(target: LoginSession | 'all', button: HTMLButtonElement) {
    trigger.current = button
    setConfirmation(target)
    setActionError(null)
    setMessage(null)
  }

  async function revoke() {
    if (!confirmation || operation.current) return
    const token = Symbol()
    const revision = authSession.revision
    operation.current = token
    setPending(true)
    setActionError(null)
    try {
      if (confirmation === 'all') await authApi.revokeAllSessions()
      else await authApi.revokeSession(confirmation.id)
      if (operation.current !== token || revision !== authSession.revision) return
      if (confirmation === 'all' || confirmation.current) {
        clearSession()
        void navigate('/login', { replace: true })
        return
      }
      setConfirmation(null)
      setMessage('Sesi dicabut. Perangkat tersebut perlu login lagi untuk memperpanjang sesi.')
      reload()
      heading.current?.focus()
    } catch (cause) {
      if (operation.current === token && revision === authSession.revision) setActionError(getApiErrorMessage(cause))
    } finally {
      if (operation.current === token) {
        operation.current = null
        setPending(false)
      }
    }
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="max-w-3xl space-y-3">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold text-spotify-white focus-visible:outline-2 focus-visible:outline-spotify-white md:text-5xl">Sesi login</h1>
        <p className="text-sm leading-relaxed text-spotify-light-gray">Kelola perangkat yang dapat memperpanjang login akunmu. Perangkat lain mungkin tidak langsung terputus setelah sesi dicabut.</p>
        <p className="text-sm leading-relaxed text-spotify-light-gray">Informasi browser dan alamat IP hanya petunjuk, bukan identitas perangkat yang terverifikasi.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" className="min-h-11" disabled={pending || isLoading} onClick={() => { setConfirmation(null); setActionError(null); reload() }}>Perbarui daftar</Button>
        <Button variant="secondary" className="min-h-11" disabled={pending || isLoading || !data?.items.length} onClick={(event) => ask('all', event.currentTarget)}>Keluar dari semua perangkat</Button>
      </div>

      {message && <p role="status" className="text-sm text-spotify-light-gray">{message}</p>}
      {confirmation && (
        <section aria-labelledby={`${confirmationId}-title`} aria-busy={pending} className="space-y-4 rounded-md border border-spotify-light-gray p-4">
          <h2 id={`${confirmationId}-title`} className="break-all font-semibold text-spotify-white">{confirmation === 'all' ? 'Keluar dari semua perangkat?' : confirmation.current ? 'Keluar dari sesi ini?' : `Cabut sesi ${deviceName(confirmation.user_agent)}?`}</h2>
          <p className="text-sm text-spotify-light-gray">{confirmation === 'all' || confirmation.current ? 'Kamu juga akan keluar dari aplikasi ini dan perlu login lagi.' : 'Sesi pada perangkat ini tetap aktif. Perangkat yang dicabut perlu login lagi saat memperpanjang sesi.'}</p>
          {actionError && <p role="alert" className="text-sm text-spotify-white">{actionError}</p>}
          <div className="flex flex-wrap gap-3">
            <Button id={`${confirmationId}-cancel`} variant="secondary" className="min-h-11" disabled={pending} onClick={() => { setConfirmation(null); trigger.current?.focus() }}>Batal</Button>
            <Button variant="secondary" className="min-h-11" disabled={pending} onClick={() => void revoke()}>{pending ? 'Mencabut sesi…' : 'Ya, cabut sesi'}</Button>
          </div>
        </section>
      )}

      {isLoading ? <LoadingState label="Memuat sesi login…" /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? <EmptyState message="Tidak ada sesi aktif dalam daftar. Perbarui daftar atau login kembali." /> : (
        <ul aria-label="Perangkat dengan sesi login" className="divide-y divide-spotify-border">
          {data.items.map((session) => (
            <li key={session.id} className="flex min-w-0 flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="min-w-0 break-all font-semibold text-spotify-white">{deviceName(session.user_agent)}</h2>
                  {session.current && <span className="text-sm font-medium text-spotify-green">Sesi ini</span>}
                </div>
                <p className="break-all text-sm text-spotify-light-gray">IP: {session.ip_address || 'Tidak tersedia'}</p>
                <dl className="grid gap-3 text-sm text-spotify-light-gray md:grid-cols-3">
                  <div><dt>Login pada</dt><dd className="mt-1">{dateLabel(session.created_at)}</dd></div>
                  <div><dt>Terakhir diperbarui</dt><dd className="mt-1">{dateLabel(session.last_used_at)}</dd></div>
                  <div><dt>Berlaku sampai</dt><dd className="mt-1">{dateLabel(session.expires_at)}</dd></div>
                </dl>
              </div>
              <Button variant="secondary" className="min-h-11 self-start" disabled={pending} aria-label={`Cabut sesi ${deviceName(session.user_agent)}${session.current ? ' (sesi ini)' : ''}`} onClick={(event) => ask(session, event.currentTarget)}>{session.current ? 'Keluar dari sesi ini' : 'Cabut sesi'}</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
