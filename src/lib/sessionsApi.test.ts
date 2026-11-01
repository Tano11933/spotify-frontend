import { afterEach, expect, it, vi } from 'vitest'
import { api, authApi } from './api'

afterEach(() => vi.restoreAllMocks())

it('uses the session listing and ownership-scoped revocation endpoints', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { items: [] } })
  const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: { message: 'revoked' } })
  expect(await authApi.getSessions()).toEqual({ items: [] })
  await authApi.revokeSession('fixture/id')
  await authApi.revokeAllSessions()
  expect(get).toHaveBeenCalledWith('/auth/sessions')
  expect(remove.mock.calls.map(([url]) => url)).toEqual(['/auth/sessions/fixture%2Fid', '/auth/sessions'])
})
