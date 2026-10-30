import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  authApi: { refresh: vi.fn(), me: vi.fn(), login: vi.fn(), logout: vi.fn(), register: vi.fn() },
  configureAuthBridge: vi.fn(),
  getApiErrorMessage: (error: Error) => error.message,
}))

import { authApi, configureAuthBridge, type AuthBridge } from '@/lib/api'
import { authSession, AUTH_SESSION_KEY } from '@/lib/authSession'
import { useAuthStore } from './authStore'
import type { TokenPair, User } from '@/types'

const pair = (n: number): TokenPair => ({ access_token: `a${n}`, refresh_token: `r${n}`, expires_in: 900, token_type: 'Bearer' })
const user = { id: 'fixture-a', name: 'Fixture A', email: 'a@example.test', role: 'user', created_at: '', updated_at: '' } as User
const bridge = vi.mocked(configureAuthBridge).mock.calls[0]![0] as AuthBridge

beforeEach(() => {
  authSession.end()
  authSession.onTokens = bridge.onTokensRefreshed
  authSession.onEnd = bridge.onAuthFailure
  vi.mocked(authApi.refresh).mockReset().mockImplementation(() => authSession.refresh(async () => pair(1), () => false, 'a0'))
  vi.mocked(authApi.me).mockReset().mockResolvedValue(user)
  vi.mocked(authApi.logout).mockReset().mockResolvedValue({ message: 'logged out' })
  vi.mocked(authApi.login).mockReset()
  authSession.start(pair(0))
  useAuthStore.setState({ user: null, status: 'idle' })
})

describe('auth store session lifecycle', () => {
  it('bootstraps concurrent callers through the coordinator before fetching the profile', async () => {
    await Promise.all([useAuthStore.getState().bootstrap(), useAuthStore.getState().bootstrap()])
    expect(useAuthStore.getState()).toMatchObject({ user, status: 'authenticated', accessToken: 'a1', refreshToken: 'r1' })
    expect(authApi.me).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)!)).toMatchObject({ refreshToken: 'r1' })
  })

  it('clears local credentials immediately and discards refresh completion after logout', async () => {
    let resolve!: (tokens: TokenPair) => void
    vi.mocked(authApi.refresh).mockImplementation(() => authSession.refresh(() => new Promise((done) => { resolve = done }), () => false, 'a0'))
    const pending = useAuthStore.getState().bootstrap()
    const logout = useAuthStore.getState().logout()
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', accessToken: null, refreshToken: null })
    resolve(pair(1))
    await Promise.all([pending, logout])
    expect(authApi.me).not.toHaveBeenCalled()
    expect(authSession.snapshot).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('does not replace a newer account with a late bootstrap response', async () => {
    let resolve!: (tokens: TokenPair) => void
    vi.mocked(authApi.refresh).mockImplementation(() => authSession.refresh(() => new Promise((done) => { resolve = done }), () => false, 'a0'))
    const pending = useAuthStore.getState().bootstrap()
    const next = { ...user, id: 'fixture-b', name: 'Fixture B' }
    vi.mocked(authApi.login).mockResolvedValue({ user: next, tokens: pair(9) })
    await useAuthStore.getState().login({ email: 'b@example.test', password: 'fixture-password' })
    resolve(pair(1))
    await pending
    expect(useAuthStore.getState()).toMatchObject({ user: next, accessToken: 'a9', refreshToken: 'r9', status: 'authenticated' })
    expect(authSession.snapshot?.refreshToken).toBe('r9')
  })

  it('preserves the persisted refresh token after temporary bootstrap failure', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('offline'))
    await useAuthStore.getState().bootstrap()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(authSession.snapshot?.refreshToken).toBe('r0')
    expect(JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)!)).toMatchObject({ refreshToken: 'r0' })
  })

  it('discards a profile response from an earlier session after a new login', async () => {
    let complete!: (value: User) => void
    let ready!: () => void
    const started = new Promise<void>((resolve) => { ready = resolve })
    vi.mocked(authApi.me).mockImplementation(() => new Promise((resolve) => { complete = resolve; ready() }))
    const pending = useAuthStore.getState().bootstrap()
    await started
    const next = { ...user, id: 'fixture-b', name: 'Fixture B' }
    vi.mocked(authApi.login).mockResolvedValue({ user: next, tokens: pair(9) })
    await useAuthStore.getState().login({ email: 'b@example.test', password: 'fixture-password' })
    complete(user)
    await pending
    expect(useAuthStore.getState()).toMatchObject({ user: next, accessToken: 'a9', status: 'authenticated' })
  })
})
