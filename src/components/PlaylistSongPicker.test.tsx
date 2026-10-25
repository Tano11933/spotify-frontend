import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ getApiErrorMessage: (cause: Error) => cause.message, catalogApi: { getSongs: vi.fn() } }))

import { PlaylistSongPicker } from '@/components/PlaylistSongPicker'
import { catalogApi } from '@/lib/api'
import { makeSong } from '@/test/player'

describe('PlaylistSongPicker', () => {
  beforeEach(() => vi.mocked(catalogApi.getSongs).mockReset())

  it('can load another page when all current choices are already in the playlist', async () => {
    const songs = Array.from({ length: 24 }, (_, index) => makeSong(index + 1))
    vi.mocked(catalogApi.getSongs)
      .mockResolvedValueOnce({ items: songs, total: 25, limit: 24, offset: 0 })
      .mockResolvedValueOnce({ items: [makeSong(25)], total: 25, limit: 24, offset: 24 })
    render(<PlaylistSongPicker selectedSongs={songs} disabled={false} onAdd={vi.fn()} />)
    await screen.findByText(/Semua lagu yang dimuat sudah ada/)
    fireEvent.click(screen.getByRole('button', { name: 'Muat lagi' }))
    await screen.findByRole('option', { name: /Audio fixture 25/ })
    expect(screen.queryByRole('button', { name: 'Muat lagi' })).not.toBeInTheDocument()
  })

  it('retains choices and retries a failed subsequent page', async () => {
    vi.mocked(catalogApi.getSongs)
      .mockResolvedValueOnce({ items: [makeSong()], total: 2, limit: 24, offset: 0 })
      .mockRejectedValueOnce(new Error('Katalog gagal'))
      .mockResolvedValueOnce({ items: [makeSong(2)], total: 2, limit: 24, offset: 1 })
    render(<PlaylistSongPicker selectedSongs={[]} disabled={false} onAdd={vi.fn()} />)
    await screen.findByRole('option', { name: /Audio fixture 1/ })
    fireEvent.click(screen.getByRole('button', { name: 'Muat lagi' }))
    await screen.findByText('Katalog gagal')
    expect(screen.getByRole('option', { name: /Audio fixture 1/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    await screen.findByRole('option', { name: /Audio fixture 2/ })
    expect(catalogApi.getSongs).toHaveBeenLastCalledWith({ limit: 24, offset: 1 })
  })

  it('preserves selection on an add failure and clears it only after success', async () => {
    vi.mocked(catalogApi.getSongs).mockResolvedValue({ items: [makeSong()], total: 1, limit: 24, offset: 0 })
    const add = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    render(<PlaylistSongPicker selectedSongs={[]} disabled={false} onAdd={add} />)
    await screen.findByRole('option', { name: /Audio fixture 1/ })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tambah lagu' }))
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('combobox')).toHaveValue('1')
    fireEvent.click(screen.getByRole('button', { name: 'Tambah lagu' }))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue(''))
    expect(add).toHaveBeenCalledTimes(2)
  })
})
