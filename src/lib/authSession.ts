import type { TokenPair } from '@/types'

export const AUTH_SESSION_KEY = 'spotify-clone.auth-session'
export const LEGACY_REFRESH_KEY = 'spotify-clone.refresh-token'

export interface AuthSessionRecord { id: string; refreshToken: string }
type SessionMessage = { type: 'changed' } | { type: 'tokens'; sessionId: string; tokens: TokenPair }
export interface SessionPlatform {
  read: () => AuthSessionRecord | null | undefined
  write: (session: AuthSessionRecord | null) => void
  publish: (message: SessionMessage) => void
  subscribe: (listener: (message: SessionMessage) => void) => () => void
  withLock?: <T>(task: () => Promise<T>) => Promise<T>
}

export class SessionChangedError extends Error {
  constructor() { super('Sesi sudah berubah. Masuk kembali untuk melanjutkan.'); this.name = 'SessionChangedError' }
}

export class AuthSessionCoordinator {
  private session: AuthSessionRecord | null
  private cached: { tokens: TokenPair; expiresAt: number } | null = null
  private version = 0
  private pending: { version: number; promise: Promise<TokenPair> } | null = null
  private unsubscribe: () => void
  private waiters = new Set<() => void>()
  private platform: SessionPlatform
  onTokens: (tokens: TokenPair) => void = () => {}
  onEnd: () => void = () => {}

  constructor(platform: SessionPlatform) {
    this.platform = platform
    this.session = platform.read() ?? null
    this.unsubscribe = platform.subscribe((message) => {
      const shared = this.shared()
      if (this.session && shared?.id !== this.session.id) this.clearLocal()
      else if (this.session && shared) this.session = shared
      if (message.type === 'tokens' && this.session?.id === message.sessionId &&
        shared?.refreshToken === message.tokens.refresh_token) this.accept(message.tokens)
      for (const wake of this.waiters) wake()
    })
  }

  get snapshot() { return this.session }
  get revision() { return this.version }

  start(tokens: TokenPair) {
    this.version++
    const id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)),
      (byte) => byte.toString(16).padStart(2, '0')).join('')
    this.session = { id, refreshToken: tokens.refresh_token }
    this.platform.write(this.session)
    this.accept(tokens)
    this.platform.publish({ type: 'changed' })
  }

  end() {
    const previous = this.session
    const shared = this.shared()
    this.clearLocal()
    if (previous && shared?.id === previous.id) {
      this.platform.write(null)
      this.platform.publish({ type: 'changed' })
    }
  }

  destroy() { this.unsubscribe(); this.clearLocal() }

  refresh(send: (token: string) => Promise<TokenPair>, invalid: (error: unknown) => boolean, rejectedAccess?: string): Promise<TokenPair> {
    if (this.pending?.version === this.version) return this.pending.promise
    const session = this.session
    if (!session) return Promise.reject(new SessionChangedError())
    const version = this.version
    const task = () => this.rotate(session.id, version, send, invalid, rejectedAccess)
    const promise = (this.platform.withLock ? this.platform.withLock(task) : task())
    this.pending = { version, promise }
    void promise.finally(() => {
      if (this.pending?.promise === promise) this.pending = null
    }).catch(() => {})
    return promise
  }

  private shared() {
    const record = this.platform.read()
    return record === undefined ? this.session : record
  }

  private current(id: string, version: number) {
    if (this.version !== version || this.session?.id !== id) throw new SessionChangedError()
    const shared = this.shared()
    if (shared?.id !== id) { this.clearLocal(); throw new SessionChangedError() }
    this.session = shared
    return shared
  }

  private accept(tokens: TokenPair) {
    this.cached = { tokens, expiresAt: Date.now() + Math.max(0, tokens.expires_in - 5) * 1000 }
    this.onTokens(tokens)
  }

  private clearLocal() {
    this.version++
    this.session = null
    this.cached = null
    this.onEnd()
    for (const wake of this.waiters) wake()
  }

  private async waitForRotation(id: string, version: number, previous: string) {
    if (this.current(id, version).refreshToken !== previous) return
    await new Promise<void>((resolve) => {
      const wake = () => {
        if (this.version !== version || this.shared()?.refreshToken !== previous) finish()
      }
      const finish = () => { clearTimeout(timer); this.waiters.delete(wake); resolve() }
      const timer = setTimeout(finish, 1500)
      this.waiters.add(wake)
      wake()
    })
  }

  private async rotate(id: string, version: number, send: (token: string) => Promise<TokenPair>, invalid: (error: unknown) => boolean, rejectedAccess?: string): Promise<TokenPair> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const record = this.current(id, version)
      if (this.cached && this.cached.expiresAt > Date.now() &&
        this.cached.tokens.refresh_token === record.refreshToken && this.cached.tokens.access_token !== rejectedAccess) {
        this.onTokens(this.cached.tokens)
        return this.cached.tokens
      }
      let tokens: TokenPair
      try {
        tokens = await send(record.refreshToken)
      } catch (error) {
        this.current(id, version)
        if (!invalid(error)) throw error
        if (!this.platform.withLock) await this.waitForRotation(id, version, record.refreshToken)
        const latest = this.current(id, version)
        if (latest.refreshToken !== record.refreshToken) continue
        // Without Web Locks a rejected request may race a winner whose response is delayed.
        if (this.platform.withLock) this.end()
        throw error
      }
      const latest = this.current(id, version)
      if (latest.refreshToken !== record.refreshToken) continue
      this.session = { id, refreshToken: tokens.refresh_token }
      this.platform.write(this.session)
      this.accept(tokens)
      this.platform.publish({ type: 'tokens', sessionId: id, tokens })
      return tokens
    }
    throw new Error('Sesi sedang diperbarui di tab lain. Coba lagi.')
  }
}

function browserPlatform(): SessionPlatform {
  let storageAvailable = typeof window !== 'undefined'
  let channel: BroadcastChannel | undefined
  try {
    if (typeof window !== 'undefined' && window.BroadcastChannel) channel = new window.BroadcastChannel('spotify-clone.auth')
  } catch { /* Storage events and Web Locks remain available. */ }
  return {
    read: () => {
      if (!storageAvailable) return undefined
      try {
        const value = localStorage.getItem(AUTH_SESSION_KEY)
        if (value !== null) {
          const record: unknown = JSON.parse(value)
          if (record && typeof record === 'object' && 'id' in record && typeof record.id === 'string' &&
            'refreshToken' in record && typeof record.refreshToken === 'string') return record as AuthSessionRecord
          return null
        }
        const legacy = localStorage.getItem(LEGACY_REFRESH_KEY)
        return legacy ? { id: 'legacy', refreshToken: legacy } : null
      } catch { storageAvailable = false; return undefined }
    },
    write: (record) => {
      if (!storageAvailable) return
      try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(record))
        localStorage.removeItem(LEGACY_REFRESH_KEY)
      } catch { storageAvailable = false }
    },
    publish: (message) => { try { channel?.postMessage(message) } catch { /* Other tabs can read storage inside the lock. */ } },
    subscribe: (listener) => {
      const storage = (event: StorageEvent) => { if (event.key === AUTH_SESSION_KEY || event.key === null) listener({ type: 'changed' }) }
      const message = (event: MessageEvent<SessionMessage>) => {
        if (event.data?.type === 'changed' || (event.data?.type === 'tokens' && event.data.tokens && typeof event.data.sessionId === 'string')) listener(event.data)
      }
      window.addEventListener('storage', storage)
      channel?.addEventListener('message', message)
      return () => { window.removeEventListener('storage', storage); channel?.close() }
    },
    withLock: typeof navigator !== 'undefined' && navigator.locks
      ? async (task) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 25_000)
        try { return await navigator.locks.request('spotify-clone.auth-refresh', { signal: controller.signal }, task) }
        finally { clearTimeout(timer) }
      }
      : undefined,
  }
}

export const authSession = new AuthSessionCoordinator(browserPlatform())
