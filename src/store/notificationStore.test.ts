import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  notificationApi: { markAllRead: vi.fn() },
}))

import { notificationApi } from '@/lib/api'
import { useNotificationStore } from '@/store/notificationStore'

const markAllReadMock = vi.mocked(notificationApi.markAllRead)

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ unread: 0 })
    markAllReadMock.mockReset()
  })

  it('setUnread menyimpan angka dan menahan nilai negatif', () => {
    useNotificationStore.getState().setUnread(5)
    expect(useNotificationStore.getState().unread).toBe(5)

    useNotificationStore.getState().setUnread(-3)
    expect(useNotificationStore.getState().unread).toBe(0)
  })

  it('increment menaikkan angka', () => {
    useNotificationStore.getState().increment()
    useNotificationStore.getState().increment()

    expect(useNotificationStore.getState().unread).toBe(2)
  })

  it('markAllRead tidak memanggil API kalau badge sudah nol', async () => {
    await useNotificationStore.getState().markAllRead()

    expect(markAllReadMock).not.toHaveBeenCalled()
  })

  it('markAllRead memanggil API lalu mengosongkan badge', async () => {
    markAllReadMock.mockResolvedValue({ message: 'ok' })
    useNotificationStore.getState().setUnread(3)

    await useNotificationStore.getState().markAllRead()

    expect(markAllReadMock).toHaveBeenCalledTimes(1)
    expect(useNotificationStore.getState().unread).toBe(0)
  })
})
