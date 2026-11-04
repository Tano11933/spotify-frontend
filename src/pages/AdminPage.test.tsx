import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { id: 'admin', role: 'admin' } }),
}))
vi.mock('@/lib/api', () => ({
  catalogApi: { getArtists: vi.fn(), getAlbums: vi.fn(), getSongs: vi.fn() },
  genresApi: { getAll: vi.fn() },
  adminApi: { uploadAudio: vi.fn() },
  getApiErrorMessage: (cause: Error) => cause.message,
}))

import { AdminPage } from './AdminPage'
import { adminApi, catalogApi, genresApi } from '@/lib/api'
import { makeSong } from '@/test/player'

beforeEach(() => {
  const page = { items: [], total: 0, limit: 100, offset: 0 }
  vi.mocked(catalogApi.getArtists).mockResolvedValue(page)
  vi.mocked(catalogApi.getAlbums).mockResolvedValue(page)
  vi.mocked(genresApi.getAll).mockResolvedValue(page)
  vi.mocked(catalogApi.getSongs).mockResolvedValue({ ...page, items: [makeSong(9)], total: 1 })
  vi.mocked(adminApi.uploadAudio).mockResolvedValue(makeSong(9))
})

it('announces the selected category and moves keyboard focus into and out of the song editor', async () => {
  const user = userEvent.setup()
  render(<AdminPage />)
  const songs = await screen.findByRole('button', { name: 'Lagu' })
  expect(screen.getByRole('button', { name: 'Artist' })).toHaveAttribute('aria-pressed', 'true')
  songs.focus()
  await user.keyboard('{Enter}')
  expect(songs).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Artist' })).toHaveAttribute('aria-pressed', 'false')
  const edit = screen.getByRole('button', { name: 'Edit lagu Audio fixture 9' })
  expect(screen.getByRole('button', { name: 'Hapus lagu Audio fixture 9' })).toBeEnabled()
  edit.focus()
  await user.keyboard('{Enter}')
  expect(screen.getByLabelText('Judul lagu')).toHaveFocus()
  const cancel = screen.getByRole('button', { name: 'Batal' })
  cancel.focus()
  await user.keyboard('{Enter}')
  expect(edit).toHaveFocus()
  expect(screen.getByLabelText('Judul lagu')).toHaveValue('')
})

it('exposes audio replacement for the edited song and closes it when changing tabs', async () => {
  render(<AdminPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Lagu' }))
  expect(screen.getByText('Simpan lagu, lalu pilih Edit untuk mengunggah file audio.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit lagu Audio fixture 9' }))
  expect(screen.getByRole('region', { name: 'Audio untuk Audio fixture 9' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('File audio'), { target: { files: [new File(['fixture'], 'test.wav')] } })
  fireEvent.click(screen.getByRole('button', { name: 'Unggah audio' }))
  await screen.findByRole('button', { name: 'Putar hasil unggah' })
  expect(adminApi.uploadAudio).toHaveBeenCalledWith(9, expect.any(File), expect.any(Object))
  fireEvent.click(screen.getByRole('button', { name: 'Album' }))
  expect(screen.queryByLabelText('File audio')).not.toBeInTheDocument()
})
