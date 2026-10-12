import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { NotificationBell } from '@/components/NotificationBell'
import { useNotificationStore } from '@/store/notificationStore'

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  )
}

describe('NotificationBell', () => {
  beforeEach(() => {
    useNotificationStore.setState({ unread: 0 })
  })

  it('menautkan ke halaman notifikasi tanpa badge saat tidak ada unread', () => {
    renderBell()

    const link = screen.getByRole('link', { name: 'Notifikasi' })
    expect(link).toHaveAttribute('href', '/notifications')
  })

  it('menampilkan badge dan aria-label yang menyebut jumlahnya', () => {
    useNotificationStore.setState({ unread: 3 })
    renderBell()

    expect(screen.getByRole('link', { name: 'Notifikasi, 3 belum dibaca' })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('membatasi angka badge di 9+', () => {
    useNotificationStore.setState({ unread: 12 })
    renderBell()

    expect(screen.getByText('9+')).toBeInTheDocument()
  })
})
