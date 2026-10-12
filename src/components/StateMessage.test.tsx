import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EmptyState, ErrorState, LoadingState } from '@/components/StateMessage'

describe('StateMessage', () => {
  it('LoadingState mengumumkan status dan menampilkan label', () => {
    render(<LoadingState label="Memuat daftar…" />)

    // role="status" tidak mengambil nama dari isinya (name from author), jadi
    // yang diperiksa isi teksnya, bukan accessible name.
    expect(screen.getByRole('status')).toHaveTextContent('Memuat daftar…')
    expect(screen.getAllByText('Memuat daftar…').length).toBeGreaterThanOrEqual(1)
  })

  it('EmptyState menampilkan pesan', () => {
    render(<EmptyState message="Belum ada lagu." />)

    expect(screen.getByText('Belum ada lagu.')).toBeInTheDocument()
  })

  it('ErrorState memanggil onRetry saat tombol Coba lagi diklik', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Gagal memuat." onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('ErrorState tanpa onRetry tidak menampilkan tombol', () => {
    render(<ErrorState message="Gagal." />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
