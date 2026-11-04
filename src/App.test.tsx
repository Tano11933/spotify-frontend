import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ authApi: {}, configureAuthBridge: vi.fn() }))
vi.mock('@/components/layout/AppLayout', async () => ({ AppLayout: (await import('react-router')).Outlet }))
vi.mock('@/pages/HomePage', () => ({ HomePage: () => <h1>Home fixture</h1> }))
vi.mock('@/pages/LoginPage', () => ({ LoginPage: () => <h1>Login fixture</h1> }))
vi.mock('@/pages/ResetPasswordPage', () => ({ ResetPasswordPage: () => <h1>Reset fixture</h1> }))
vi.mock('@/pages/AdminPage', () => ({ AdminPage: () => <h1>Admin fixture</h1> }))
vi.mock('@/pages/SessionsPage', () => ({ SessionsPage: () => <h1>Sessions fixture</h1> }))
vi.mock('@/pages/NotFoundPage', () => ({ NotFoundPage: () => <h1>Not found fixture</h1> }))

import App from '@/App'
import { useAuthStore } from '@/store/authStore'

beforeEach(() => useAuthStore.setState({ status: 'unauthenticated', user: null, accessToken: null, refreshToken: null }))

function mount(path: string) { return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>) }

it('redirects guests from protected lazy pages to login', async () => {
  mount('/admin')
  await screen.findByRole('heading', { name: 'Login fixture' })
  expect(screen.queryByRole('heading', { name: 'Admin fixture' })).not.toBeInTheDocument()
})

it('does not show a protected page while the session is bootstrapping', () => {
  useAuthStore.setState({ status: 'bootstrapping' })
  mount('/account/sessions')
  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})

it('loads a protected page for an authenticated session', async () => {
  useAuthStore.setState({ status: 'authenticated' })
  mount('/account/sessions')
  await screen.findByRole('heading', { name: 'Sessions fixture' })
})

it('redirects authenticated users away from guest-only pages', async () => {
  useAuthStore.setState({ status: 'authenticated' })
  mount('/login')
  await screen.findByRole('heading', { name: 'Home fixture' })
})

it('keeps reset-password reachable while authenticated', async () => {
  useAuthStore.setState({ status: 'authenticated' })
  mount('/reset-password?token=fixture')
  await screen.findByRole('heading', { name: 'Reset fixture' })
})

it('loads the existing not-found page for an unknown route', async () => {
  mount('/does-not-exist')
  await screen.findByRole('heading', { name: 'Not found fixture' })
})
