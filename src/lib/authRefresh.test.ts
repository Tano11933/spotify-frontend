import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api, authApi, configureAuthBridge } from './api'
import { authSession, SessionChangedError } from './authSession'
import type { TokenPair } from '@/types'

const pair = (n: number): TokenPair => ({ access_token: `a${n}`, refresh_token: `r${n}`, expires_in: 900, token_type: 'Bearer' })
const originalAdapter = api.defaults.adapter
let access: string | null
const onFailure = vi.fn()
function response(config: InternalAxiosRequestConfig, status = 200) {
  return { data: { ok: true }, status, statusText: '', headers: {}, config }
}
function rejected(config: InternalAxiosRequestConfig, status = 401) {
  return new AxiosError('rejected', 'ERR_BAD_REQUEST', config, undefined, response(config, status))
}

beforeEach(() => {
  authSession.end()
  configureAuthBridge({
    getAccessToken: () => access,
    getRefreshToken: () => authSession.snapshot?.refreshToken ?? null,
    onTokensRefreshed: (tokens) => { access = tokens.access_token },
    onAuthFailure: onFailure,
  })
  authSession.start(pair(0))
  onFailure.mockReset()
})
afterEach(() => { authSession.end(); api.defaults.adapter = originalAdapter; vi.restoreAllMocks() })

describe('authenticated request recovery', () => {
  it('recovers concurrent 401s with a single refresh and one retry per request', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: pair(1) })
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      if (config.headers.Authorization === 'Bearer a0') throw rejected(config)
      return response(config)
    })
    api.defaults.adapter = adapter
    await Promise.all(Array.from({ length: 8 }, () => api.get('/auth/me')))
    expect(refresh).toHaveBeenCalledOnce()
    expect(adapter).toHaveBeenCalledTimes(16)
    expect(access).toBe('a1')
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('shares bootstrap refresh with interceptor recovery', async () => {
    let complete!: (response: { data: TokenPair }) => void
    let ready!: () => void
    const started = new Promise<void>((resolve) => { ready = resolve })
    vi.spyOn(axios, 'post').mockImplementation(() => new Promise((resolve) => { complete = resolve; ready() }))
    api.defaults.adapter = async (config) => {
      if (config.headers.Authorization === 'Bearer a0') throw rejected(config)
      return response(config)
    }
    const request = api.get('/auth/me')
    await started
    const bootstrap = authApi.refresh()
    complete({ data: pair(1) })
    await request
    expect(await bootstrap).toEqual(pair(1))
    expect(axios.post).toHaveBeenCalledOnce()
  })

  it('does not end a session when the retried resource request fails', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: pair(1) })
    api.defaults.adapter = async (config) => { throw rejected(config, config.headers.Authorization === 'Bearer a0' ? 401 : 403) }
    await expect(api.get('/auth/me')).rejects.toMatchObject({ response: { status: 403 } })
    expect(authSession.snapshot?.refreshToken).toBe('r1')
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('preserves the session after a refresh network failure', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new AxiosError('offline', 'ERR_NETWORK'))
    api.defaults.adapter = async (config) => { throw rejected(config) }
    await expect(api.get('/auth/me')).rejects.toThrow('offline')
    expect(authSession.snapshot?.refreshToken).toBe('r0')
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('never retries an old account request with a new account token', async () => {
    let fail!: () => void
    let ready!: () => void
    const started = new Promise<void>((resolve) => { ready = resolve })
    const adapter = vi.fn<AxiosAdapter>((config) => new Promise((_, reject) => { fail = () => reject(rejected(config)); ready() }))
    api.defaults.adapter = adapter
    const pending = api.get('/auth/me')
    await started
    authSession.start(pair(9))
    fail()
    await expect(pending).rejects.toBeInstanceOf(SessionChangedError)
    expect(adapter).toHaveBeenCalledOnce()
    expect(authSession.snapshot?.refreshToken).toBe('r9')
  })

  it('sends captured logout credentials and never refreshes on logout failure', async () => {
    const refresh = vi.spyOn(axios, 'post')
    const adapter = vi.fn<AxiosAdapter>(async (config) => { throw rejected(config) })
    api.defaults.adapter = adapter
    authSession.start(pair(9))
    await expect(authApi.logout('a0')).rejects.toMatchObject({ response: { status: 401 } })
    expect(adapter.mock.calls[0]![0].headers.Authorization).toBe('Bearer a0')
    expect(refresh).not.toHaveBeenCalled()
    expect(authSession.snapshot?.refreshToken).toBe('r9')
  })
})
