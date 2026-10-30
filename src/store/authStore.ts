import { create } from 'zustand'

import { authApi, configureAuthBridge, getApiErrorMessage } from '@/lib/api'
import { authSession } from '@/lib/authSession'
import type { TokenPair, User } from '@/types'

let authAction = 0

export type AuthStatus = 'idle' | 'bootstrapping' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  status: AuthStatus

  /** Memulihkan sesi saat aplikasi dibuka. Dipanggil sekali dari App. */
  bootstrap: () => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  register: (input: { name: string; email: string; password: string }) => Promise<User>
  logout: () => Promise<void>
  setTokens: (tokens: TokenPair) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: authSession.snapshot?.refreshToken ?? null,
  status: 'idle',

  setTokens: (tokens) => {
    set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
  },

  clearSession: () => {
    authAction++
    authSession.end()
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: 'unauthenticated',
    })
  },

  bootstrap: async () => {
    const action = ++authAction
    const sessionId = authSession.snapshot?.id
    if (!get().refreshToken) {
      set({ status: 'unauthenticated' })
      return
    }

    set({ status: 'bootstrapping' })

    try {
      await authApi.refresh()
      if (action !== authAction || authSession.snapshot?.id !== sessionId) return

      const user = await authApi.me()
      if (action !== authAction || authSession.snapshot?.id !== sessionId) return
      set({ user, status: 'authenticated' })
    } catch {
      if (action === authAction) set({ user: null, accessToken: null, status: 'unauthenticated' })
    }
  },

  login: async ({ email, password }) => {
    const action = ++authAction
    const { user, tokens } = await authApi.login({ email, password })
    if (action !== authAction) return
    authSession.start(tokens)
    set({
      user,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      status: 'authenticated',
    })
  },

  register: async (input) => {
    return authApi.register(input)
  },

  logout: async () => {
    const token = get().accessToken
    get().clearSession()
    try {
      await authApi.logout(token ?? undefined)
    } catch (error) {
      console.warn('logout request gagal:', getApiErrorMessage(error))
    }
  },
}))

configureAuthBridge({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (tokens) => useAuthStore.getState().setTokens(tokens),
  onAuthFailure: () => {
    authAction++
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, status: 'unauthenticated' })
  },
})
