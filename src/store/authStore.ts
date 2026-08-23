import { create } from 'zustand'

import { authApi, configureAuthBridge, getApiErrorMessage } from '@/lib/api'
import type { TokenPair, User } from '@/types'

const REFRESH_TOKEN_KEY = 'spotify-clone.refresh-token'

function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

function writeStoredRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  } catch {
    
  }
}

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
  refreshToken: readStoredRefreshToken(),
  status: 'idle',

  setTokens: (tokens) => {
    writeStoredRefreshToken(tokens.refresh_token)
    set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
  },

  clearSession: () => {
    writeStoredRefreshToken(null)
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: 'unauthenticated',
    })
  },

  bootstrap: async () => {
    if (!get().refreshToken) {
      set({ status: 'unauthenticated' })
      return
    }

    set({ status: 'bootstrapping' })

    try {
      const user = await authApi.me()
      set({ user, status: 'authenticated' })
    } catch {
      get().clearSession()
    }
  },

  login: async ({ email, password }) => {
    const { user, tokens } = await authApi.login({ email, password })

    writeStoredRefreshToken(tokens.refresh_token)
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
    try {
      await authApi.logout()
    } catch (error) {
      console.warn('logout request gagal:', getApiErrorMessage(error))
    } finally {
      get().clearSession()
    }
  },
}))

configureAuthBridge({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (tokens) => useAuthStore.getState().setTokens(tokens),
  onAuthFailure: () => useAuthStore.getState().clearSession(),
})
