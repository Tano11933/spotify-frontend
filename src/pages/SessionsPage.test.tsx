import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ authApi: { getSessions: vi.fn(), revokeSession: vi.fn(), revokeAllSessions: vi.fn() }, getApiErrorMessage: (error: Error) => error.message }))
vi.mock('@/lib/authSession', () => ({ authSession: { revision: 1 } }))
vi.mock('@/store/authStore', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { id: 'fixture' }, clearSession }) }))

import { authApi } from '@/lib/api'
import { authSession } from '@/lib/authSession'
import { SessionsPage } from './SessionsPage'
import type { LoginSession } from '@/types'

const clearSession = vi.fn()
const coordinatorState = authSession as { revision: number }
const row = (id: string, current: boolean, agent: string): LoginSession => ({ id, current, user_agent: agent, ip_address: '127.0.0.1', created_at: '2026-11-01T00:00:00Z', last_used_at: '2026-11-01T01:00:00Z', expires_at: '2026-11-08T01:00:00Z' })
let rows: LoginSession[]
function show() { return render(<MemoryRouter initialEntries={['/account/sessions']}><Routes><Route path="/account/sessions" element={<SessionsPage />} /><Route path="/login" element={<p>Login fixture</p>} /></Routes></MemoryRouter>) }
async function ready() { await screen.findByText('Chrome di Windows') }

beforeEach(() => {
  coordinatorState.revision = 1
  rows = [row('first', true, 'Mozilla Windows Chrome/130.0'), row('second', false, 'Mozilla Android Firefox/130.0')]
  clearSession.mockReset()
  vi.mocked(authApi.getSessions).mockReset().mockImplementation(async () => ({ items: [...rows] }))
  vi.mocked(authApi.revokeSession).mockReset().mockImplementation(async (id) => { rows = rows.filter((item) => item.id !== id); return { message: 'revoked' } })
  vi.mocked(authApi.revokeAllSessions).mockReset().mockResolvedValue({ message: 'revoked' })
})

describe('SessionsPage', () => {
  it('shows device hints, IP, dates and the current session', async () => {
    show(); await ready()
    expect(screen.getByText('Firefox di Android')).toBeInTheDocument()
    expect(screen.getByText('Sesi ini')).toBeInTheDocument()
    expect(screen.getAllByText('IP: 127.0.0.1')).toHaveLength(2)
    expect(screen.getAllByText('Berlaku sampai')).toHaveLength(2)
  })
  it('refreshes the list and recovers from a list failure', async () => {
    vi.mocked(authApi.getSessions).mockRejectedValueOnce(new Error('API offline'))
    show(); await screen.findByText('API offline')
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' })); await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui daftar' })); await ready()
    expect(authApi.getSessions).toHaveBeenCalledTimes(3)
  })
  it('cancels a confirmation and returns focus without revoking', async () => {
    show(); await ready()
    const trigger = screen.getByRole('button', { name: 'Cabut sesi Firefox di Android' })
    fireEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(trigger).toHaveFocus()
    expect(authApi.revokeSession).not.toHaveBeenCalled()
  })
  it('revokes another session, refreshes the list and keeps this session', async () => {
    show(); await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Cabut sesi Firefox di Android' }))
    expect(authApi.revokeSession).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ya, cabut sesi' }))
    await waitFor(() => expect(screen.queryByText('Firefox di Android')).not.toBeInTheDocument())
    await ready()
    expect(authApi.revokeSession).toHaveBeenCalledWith('second')
    expect(clearSession).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Sesi dicabut')
    expect(screen.getByRole('heading', { name: 'Sesi login' })).toHaveFocus()
  })
  it('retains the confirmation for retry when revocation fails', async () => {
    vi.mocked(authApi.revokeSession).mockRejectedValueOnce(new Error('revocation failed'))
    show(); await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Cabut sesi Firefox di Android' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ya, cabut sesi' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('revocation failed')
    expect(clearSession).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ya, cabut sesi' }))
    await waitFor(() => expect(authApi.revokeSession).toHaveBeenCalledTimes(2))
  })
  it.each(['current', 'all'])('clears this session only after %s revocation succeeds', async (target) => {
    show(); await ready()
    fireEvent.click(screen.getByRole('button', { name: target === 'all' ? 'Keluar dari semua perangkat' : 'Cabut sesi Chrome di Windows (sesi ini)' }))
    expect(clearSession).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ya, cabut sesi' }))
    await screen.findByText('Login fixture')
    expect(clearSession).toHaveBeenCalledOnce()
    if (target === 'all') expect(authApi.revokeAllSessions).toHaveBeenCalledOnce()
    else expect(authApi.revokeSession).toHaveBeenCalledWith('first')
  })
  it('does not clear a new session when an old revoke response arrives', async () => {
    let resolve!: (value: { message: string }) => void
    vi.mocked(authApi.revokeAllSessions).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    show(); await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Keluar dari semua perangkat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ya, cabut sesi' }))
    expect(screen.getByRole('button', { name: 'Mencabut sesi…' })).toBeDisabled()
    coordinatorState.revision++
    await act(async () => resolve({ message: 'done' }))
    expect(clearSession).not.toHaveBeenCalled()
  })
  it('discards revocation completion after leaving the page', async () => {
    let resolve!: (value: { message: string }) => void
    vi.mocked(authApi.revokeAllSessions).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const view = show(); await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Keluar dari semua perangkat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ya, cabut sesi' }))
    view.unmount(); await act(async () => resolve({ message: 'done' }))
    expect(clearSession).not.toHaveBeenCalled()
  })
  it('offers recovery for an empty list without claiming a device identity', async () => {
    rows = []; show()
    await screen.findByText('Tidak ada sesi aktif dalam daftar. Perbarui daftar atau login kembali.')
    expect(screen.getByRole('button', { name: 'Keluar dari semua perangkat' })).toBeDisabled()
  })
})
