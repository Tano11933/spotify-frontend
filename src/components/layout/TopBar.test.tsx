import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/NotificationBell', () => ({ NotificationBell: () => null }))
vi.mock('@/store/authStore', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ status: 'authenticated', user: { id: 'fixture', name: 'Pengguna fixture', role: 'user' }, logout: vi.fn() }) }))

import { TopBar } from './TopBar'

describe('account navigation', () => {
  it('opens the sessions route from the account menu', async () => {
    render(<MemoryRouter><Routes><Route path="/" element={<TopBar isScrolled={false} />} /><Route path="/account/sessions" element={<p>Sessions route fixture</p>} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Pengguna fixture/ }))
    const link = screen.getByRole('menuitem', { name: 'Sesi login' })
    expect(link).toHaveAttribute('href', '/account/sessions')
    fireEvent.click(link)
    expect(await screen.findByText('Sessions route fixture')).toBeInTheDocument()
  })
  it('closes the account menu with Escape and restores trigger focus', () => {
    render(<MemoryRouter><TopBar isScrolled={false} /></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: /Pengguna fixture/ })
    fireEvent.click(trigger)
    const link = screen.getByRole('menuitem', { name: 'Sesi login' })
    link.focus()
    fireEvent.keyDown(link, { key: 'Escape' })
    expect(screen.queryByRole('menuitem', { name: 'Sesi login' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
