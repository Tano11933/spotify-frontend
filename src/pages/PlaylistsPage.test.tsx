import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  configureAuthBridge: vi.fn(), authApi: {}, getApiErrorMessage: (cause: Error) => cause.message,
  playlistApi: { getMine: vi.fn(), getPublic: vi.fn(), create: vi.fn(), delete: vi.fn(), getById: vi.fn(), addSong: vi.fn(), removeSong: vi.fn() },
  catalogApi: { getSongs: vi.fn() },
}))

import { PlaylistsPage } from '@/pages/PlaylistsPage'
import { playlistApi, catalogApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { makeSong } from '@/test/player'
import type { Playlist } from '@/types'

let owned: Playlist[]
let shared: Playlist[]
let catalog: ReturnType<typeof makeSong>[]
const page = <T,>(items: T[], params: { limit?: number; offset?: number } = {}) => {
  const limit = params.limit ?? 24
  const offset = params.offset ?? 0
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset }
}
const mine = () => within(screen.getByRole('region', { name: 'Playlist saya' }))
const publicList = () => within(screen.getByRole('region', { name: 'Playlist publik' }))

function playlist(id: number, owner = 'me'): Playlist {
  return { id, name: `Playlist ${id}`, description: '', is_public: owner !== 'me', user_id: owner, songs: [], created_at: '', updated_at: '' }
}

function mountPage() { return render(<MemoryRouter><PlaylistsPage /></MemoryRouter>) }

describe('PlaylistsPage pagination', () => {
  beforeEach(() => {
    owned = Array.from({ length: 121 }, (_, index) => playlist(index + 1))
    shared = Array.from({ length: 121 }, (_, index) => playlist(index + 201, 'other'))
    catalog = Array.from({ length: 121 }, (_, index) => makeSong(index + 1))
    useAuthStore.setState({ user: { id: 'me', name: 'Me', email: '', role: 'user', created_at: '', updated_at: '' } })
    vi.mocked(playlistApi.getMine).mockReset().mockImplementation(async (params) => page(owned, params))
    vi.mocked(playlistApi.getPublic).mockReset().mockImplementation(async (params) => page(shared, params))
    vi.mocked(catalogApi.getSongs).mockReset().mockImplementation(async (params) => page(catalog, params))
    vi.mocked(playlistApi.getById).mockImplementation(async (id) => [...owned, ...shared].find((item) => item.id === id)!)
    vi.mocked(playlistApi.delete).mockReset().mockImplementation(async (id) => {
      owned = owned.filter((item) => item.id !== id)
      shared = shared.filter((item) => item.id !== id)
      return { message: 'deleted' }
    })
  })

  it('loads owned and public playlists independently beyond item 100', async () => {
    mountPage()
    const ownedList = mine()
    const publicPlaylists = publicList()
    await ownedList.findByText('Playlist 1')
    await publicPlaylists.findByText('Playlist 201')
    expect(catalogApi.getSongs).not.toHaveBeenCalled()
    for (let index = 0; index < 5; index++) {
      fireEvent.click(ownedList.getByText('Muat lagi', { exact: true }))
      await ownedList.findByText(`Playlist ${Math.min(121, (index + 2) * 24)}`)
    }
    expect(ownedList.getByText('Playlist 101')).toBeInTheDocument()
    expect(ownedList.queryByText('Muat lagi', { exact: true })).not.toBeInTheDocument()
    expect(publicPlaylists.queryByText('Playlist 225')).not.toBeInTheDocument()
    fireEvent.click(publicPlaylists.getByText('Muat lagi', { exact: true }))
    await publicPlaylists.findByText('Playlist 248')
    expect(playlistApi.getPublic).toHaveBeenLastCalledWith({ limit: 24, offset: 24 })
  })

  it('keeps one list usable when the other initial request fails', async () => {
    vi.mocked(playlistApi.getMine).mockRejectedValueOnce(new Error('Daftar pribadi gagal'))
    mountPage()
    await mine().findByText('Daftar pribadi gagal')
    await publicList().findByText('Playlist 201')
    fireEvent.click(mine().getByRole('button', { name: 'Coba lagi' }))
    await mine().findByText('Playlist 1')
  })

  it('keeps earlier pages and retries the same offset after a page error', async () => {
    mountPage()
    await mine().findByText('Playlist 1')
    vi.mocked(playlistApi.getMine).mockRejectedValueOnce(new Error('Halaman gagal'))
    fireEvent.click(mine().getByRole('button', { name: 'Muat lagi' }))
    await mine().findByText('Halaman gagal')
    expect(mine().getByText('Playlist 1')).toBeInTheDocument()
    fireEvent.click(mine().getByRole('button', { name: 'Coba lagi' }))
    await mine().findByText('Playlist 48')
    expect(playlistApi.getMine).toHaveBeenLastCalledWith({ limit: 24, offset: 24 })
  })

  it('refreshes loaded pages after deletion without skipping the shifted item', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mountPage()
    await mine().findByText('Playlist 1')
    fireEvent.click(mine().getByRole('button', { name: 'Muat lagi' }))
    await mine().findByText('Playlist 48')
    fireEvent.click(mine().getByText('Playlist 1'))
    fireEvent.click(screen.getByRole('button', { name: 'Hapus playlist' }))
    await mine().findByText('Playlist 49')
    expect(mine().queryByText('Playlist 1')).not.toBeInTheDocument()
    fireEvent.click(mine().getByRole('button', { name: 'Muat lagi' }))
    await mine().findByText('Playlist 73')
    expect(mine().getAllByText('Playlist 49')).toHaveLength(1)
    expect(playlistApi.getMine).toHaveBeenLastCalledWith({ limit: 24, offset: 48 })
  })

  it('paginates the song picker beyond 100 and clears a successful selection', async () => {
    vi.mocked(playlistApi.addSong).mockImplementation(async (id, songId) => {
      owned = owned.map((item) => item.id === id ? { ...item, songs: [...item.songs!, makeSong(songId)] } : item)
      return { message: 'added' }
    })
    mountPage()
    fireEvent.click(await mine().findByText('Playlist 1'))
    const picker = within(await screen.findByRole('region', { name: 'Tambah lagu ke playlist' }))
    await picker.findByRole('option', { name: /Audio fixture 1 •/ })
    for (let index = 0; index < 5; index++) {
      fireEvent.click(picker.getByRole('button', { name: 'Muat lagi' }))
      await picker.findByRole('option', { name: new RegExp(`Audio fixture ${Math.min(121, (index + 2) * 24)} •`) })
    }
    fireEvent.change(picker.getByRole('combobox'), { target: { value: '101' } })
    fireEvent.click(picker.getByRole('button', { name: 'Tambah lagu' }))
    await screen.findByRole('button', { name: 'Hapus Audio fixture 101 dari playlist' })
    expect(playlistApi.addSong).toHaveBeenCalledWith(1, 101)
    expect(picker.getByRole('combobox')).toHaveValue('')
    expect(picker.queryByRole('option', { name: /Audio fixture 101 •/ })).not.toBeInTheDocument()
  })

  it('does not infer ownership from only the currently loaded owned page', async () => {
    shared = [{ ...playlist(121), is_public: true }]
    mountPage()
    fireEvent.click(await publicList().findByText('Playlist 121'))
    expect(screen.getByRole('button', { name: 'Hapus playlist' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tambah lagu ke playlist' })).toBeInTheDocument()
  })

  it('keeps a new public playlist in both lists without appending it twice', async () => {
    vi.mocked(playlistApi.create).mockImplementation(async (input) => {
      const created = { ...playlist(500), ...input }
      owned.unshift(created)
      shared.unshift(created)
      return created
    })
    mountPage()
    await mine().findByText('Playlist 1')
    fireEvent.change(screen.getByRole('textbox', { name: /Nama playlist/ }), { target: { value: 'Baru publik' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Jadikan publik' }))
    fireEvent.click(screen.getByRole('button', { name: 'Buat playlist' }))
    await mine().findByText('Baru publik')
    await publicList().findByText('Baru publik')
    expect(mine().getAllByText('Baru publik')).toHaveLength(1)
    expect(publicList().getAllByText('Baru publik')).toHaveLength(1)
  })

  it('keeps existing pages and exposes refresh retry if a mutation reload fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mountPage()
    fireEvent.click(await mine().findByText('Playlist 1'))
    vi.mocked(playlistApi.getMine).mockRejectedValueOnce(new Error('Refresh gagal'))
    fireEvent.click(screen.getByRole('button', { name: 'Hapus playlist' }))
    await mine().findByText(/Daftar belum diperbarui/)
    expect(mine().getByText('Playlist 1')).toBeInTheDocument()
    fireEvent.click(mine().getByRole('button', { name: 'Perbarui daftar' }))
    await waitFor(() => expect(mine().queryByText('Playlist 1')).not.toBeInTheDocument())
    expect(mine().getByText('Playlist 25')).toBeInTheDocument()
  })
})
