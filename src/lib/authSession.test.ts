import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthSessionCoordinator, SessionChangedError, type AuthSessionRecord, type SessionPlatform } from './authSession'
import type { TokenPair } from '@/types'

const pair = (id: number): TokenPair => ({ access_token: `access-${id}`, refresh_token: `refresh-${id}`, token_type: 'Bearer', expires_in: 900 })
const invalid = (error: unknown) => error === '401'
const coordinators: AuthSessionCoordinator[] = []

function environment({ locks = true, broadcast = true } = {}) {
  let stored: AuthSessionRecord | null = null
  let lock = Promise.resolve()
  const listeners = new Map<number, Parameters<SessionPlatform['subscribe']>[0]>()
  let next = 0
  function tab() {
    const id = next++
    const notify = (message: Parameters<SessionPlatform['publish']>[0]) => {
      for (const [other, listener] of listeners) if (id !== other) queueMicrotask(() => listener(message))
    }
    const platform: SessionPlatform = {
      read: () => stored ? { ...stored } : null,
      write: (value) => { stored = value; notify({ type: 'changed' }) },
      publish: (message) => { if (broadcast) notify(message) },
      subscribe: (listener) => { listeners.set(id, listener); return () => { listeners.delete(id) } },
      withLock: locks ? (task) => {
        const result = lock.then(task)
        lock = result.then(() => {}, () => {})
        return result
      } : undefined,
    }
    const coordinator = new AuthSessionCoordinator(platform)
    coordinators.push(coordinator)
    return coordinator
  }
  const first = tab()
  first.start(pair(0))
  return { first, tab, read: () => stored }
}

afterEach(() => { coordinators.splice(0).forEach((coordinator) => coordinator.destroy()); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('refresh session coordination', () => {
  it('creates a session when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    const { first } = environment()
    expect(first.snapshot?.id).toMatch(/^[a-f0-9]{32}$/)
  })
  it('shares one pending rotation across requests in the same tab', async () => {
    const { first } = environment()
    const send = vi.fn().mockResolvedValue(pair(1))
    const results = await Promise.all(Array.from({ length: 12 }, () => first.refresh(send, invalid, 'access-0')))
    expect(send).toHaveBeenCalledOnce()
    expect(results).toEqual(Array.from({ length: 12 }, () => pair(1)))
  })

  it('serializes two tabs and shares the winner without persisting access tokens', async () => {
    const { first, tab, read } = environment()
    const second = tab()
    const onTokens = vi.fn()
    second.onTokens = onTokens
    const send = vi.fn().mockResolvedValue(pair(1))
    const results = await Promise.all([first.refresh(send, invalid, 'access-0'), second.refresh(send, invalid, 'access-0')])
    expect(results).toEqual([pair(1), pair(1)])
    expect(send).toHaveBeenCalledOnce()
    expect(onTokens).toHaveBeenCalledWith(pair(1))
    expect(read()).toEqual({ id: first.snapshot!.id, refreshToken: 'refresh-1' })
  })

  it('reuses a newer access token for a late 401 instead of rotating again', async () => {
    const { first } = environment()
    const send = vi.fn().mockResolvedValue(pair(1))
    await first.refresh(send, invalid, 'access-0')
    first.onTokens = vi.fn()
    expect(await first.refresh(send, invalid, 'access-0')).toEqual(pair(1))
    expect(send).toHaveBeenCalledOnce()
    expect(first.onTokens).toHaveBeenCalledWith(pair(1))
  })

  it('rotates again after the cached access token expires', async () => {
    vi.useFakeTimers()
    const { first } = environment()
    const send = vi.fn().mockResolvedValueOnce(pair(1)).mockResolvedValueOnce(pair(2))
    await first.refresh(send, invalid, 'access-0')
    await vi.advanceTimersByTimeAsync(900_000)
    expect(await first.refresh(send, invalid)).toEqual(pair(2))
    expect(send.mock.calls.map(([token]) => token)).toEqual(['refresh-0', 'refresh-1'])
  })

  it('rotates the latest shared token when BroadcastChannel is unavailable', async () => {
    const { first, tab } = environment({ broadcast: false })
    const second = tab()
    const send = vi.fn().mockImplementation(async (token: string) => token === 'refresh-0' ? pair(1) : pair(2))
    await Promise.all([first.refresh(send, invalid, 'access-0'), second.refresh(send, invalid, 'access-0')])
    expect(send.mock.calls.map(([token]) => token)).toEqual(['refresh-0', 'refresh-1'])
    expect(second.snapshot?.refreshToken).toBe('refresh-2')
  })

  it('recovers the winning tab after a CAS conflict without Web Locks', async () => {
    const { first, tab } = environment({ locks: false })
    const second = tab()
    let valid = 'refresh-0'
    const send = vi.fn(async (token: string) => {
      await Promise.resolve()
      if (token !== valid) throw '401'
      valid = 'refresh-1'
      return pair(1)
    })
    expect(await Promise.all([first.refresh(send, invalid, 'access-0'), second.refresh(send, invalid, 'access-0')])).toEqual([pair(1), pair(1)])
    expect(first.snapshot?.refreshToken).toBe('refresh-1')
    expect(second.snapshot?.refreshToken).toBe('refresh-1')
  })

  it('does not erase a session on an ambiguous fallback failure', async () => {
    vi.useFakeTimers()
    const { first, read } = environment({ locks: false })
    const failed = expect(first.refresh(async () => { throw '401' }, invalid, 'access-0')).rejects.toBe('401')
    await vi.advanceTimersByTimeAsync(1500)
    await failed
    expect(read()?.refreshToken).toBe('refresh-0')
  })

  it('clears all attached tabs when a locked refresh is rejected', async () => {
    const { first, tab, read } = environment()
    const second = tab()
    const onEnd = vi.fn()
    second.onEnd = onEnd
    await expect(first.refresh(async () => { throw '401' }, invalid, 'access-0')).rejects.toBe('401')
    await Promise.resolve()
    expect(read()).toBeNull()
    expect(second.snapshot).toBeNull()
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('preserves credentials on network or server failure', async () => {
    const { first, read } = environment()
    await expect(first.refresh(async () => { throw new Error('offline') }, invalid, 'access-0')).rejects.toThrow('offline')
    expect(first.snapshot).toEqual(read())
    expect(read()?.refreshToken).toBe('refresh-0')
  })

  it.each(['logout', 'new login'] as const)('discards an old response after %s', async (change) => {
    const { first, read } = environment()
    let resolve!: (tokens: TokenPair) => void
    let pending!: Promise<TokenPair>
    const started = new Promise<void>((done) => {
      const send = () => new Promise<TokenPair>((complete) => { resolve = complete; done() })
      pending = first.refresh(send, invalid, 'access-0')
    })
    await started
    if (change === 'logout') first.end()
    else first.start(pair(9))
    resolve(pair(1))
    await expect(pending).rejects.toBeInstanceOf(SessionChangedError)
    expect(read()?.refreshToken ?? null).toBe(change === 'logout' ? null : 'refresh-9')
  })

  it('propagates logout and does not log another account out from a stale tab', async () => {
    const { first, tab, read } = environment()
    const second = tab()
    first.start(pair(9))
    second.end()
    await Promise.resolve()
    expect(read()?.refreshToken).toBe('refresh-9')
    expect(first.snapshot?.refreshToken).toBe('refresh-9')
  })

  it('uses an in-memory session when storage is denied', async () => {
    const first = new AuthSessionCoordinator({ read: () => undefined, write: () => {}, publish: () => {}, subscribe: () => () => {} })
    coordinators.push(first)
    first.start(pair(0))
    expect(await first.refresh(async () => pair(1), invalid, 'access-0')).toEqual(pair(1))
    first.end()
    expect(first.snapshot).toBeNull()
  })
})
