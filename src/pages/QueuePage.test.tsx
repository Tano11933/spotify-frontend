import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  getApiErrorMessage: (cause: Error) => cause.message,
  playerApi: { getQueueEntries: vi.fn(), removeQueueEntry: vi.fn() },
}))

import { QueuePage } from '@/pages/QueuePage'
import { playerApi } from '@/lib/api'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'
import { makeSong } from '@/test/player'

import type { QueueEntry } from '@/types'

let queue: QueueEntry[]
const entry = (id: number): QueueEntry => ({ id, position: id, added_at: '', song: makeSong(id) })
const advance = vi.fn<(id?: number) => Promise<void>>()

describe('QueuePage pagination', () => {
  beforeEach(() => {
    queue = Array.from({ length: 121 }, (_, index) => entry(index + 1))
    usePlayerStore.setState(usePlayerStore.getInitialState(), true)
    advance.mockReset().mockResolvedValue(undefined)
    usePlayerStore.setState({ advanceHandler: advance })
    useToastStore.setState({ toasts: [] })
    vi.mocked(playerApi.getQueueEntries).mockReset().mockImplementation(async (params = { limit: 24, offset: 0 }) => ({
      items: queue.slice(params.offset, params.offset! + params.limit!), total: queue.length, limit: params.limit!, offset: params.offset!,
    }))
    vi.mocked(playerApi.removeQueueEntry).mockReset().mockImplementation(async (id) => {
      const index = queue.findIndex((song) => song.id === id)
      if (index >= 0) queue.splice(index, 1)
      return { message: 'removed' }
    })
  })

  it('reaches entry 121 and selects it without replacing the local context', async () => {
    render(<QueuePage />)
    await screen.findByText('Audio fixture 24')
    for (let index = 0; index < 5; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Muat lagi' }))
      await screen.findByText(`Audio fixture ${Math.min(121, (index + 2) * 24)}`)
    }
    expect(screen.queryByRole('button', { name: 'Muat lagi' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Audio fixture 101'))
    expect(advance).toHaveBeenCalledWith(101)
    expect(usePlayerStore.getState().queue).toEqual([])
  })

  it('preserves valid repeated songs across pages and removes only the first occurrence', async () => {
    queue[24] = { ...entry(25), song: makeSong(1) }
    render(<QueuePage />)
    await screen.findByText('Audio fixture 24')
    fireEvent.click(screen.getByRole('button', { name: 'Muat lagi' }))
    await screen.findByText('Audio fixture 48')
    expect(screen.getAllByText('Audio fixture 1')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Hapus Audio fixture 1 dari antrean' })[0]!)
    await screen.findByText('Audio fixture 49')
    expect(screen.getAllByText('Audio fixture 1')).toHaveLength(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(48)
    fireEvent.click(screen.getByRole('button', { name: 'Muat lagi' }))
    await screen.findByText('Audio fixture 73')
    expect(screen.getAllByText('Audio fixture 49')).toHaveLength(1)
    expect(playerApi.getQueueEntries).toHaveBeenLastCalledWith({ limit: 24, offset: 48 })
  })

  it('keeps entries visible when the next page fails and retries that page', async () => {
    render(<QueuePage />)
    await screen.findByText('Audio fixture 24')
    vi.mocked(playerApi.getQueueEntries).mockRejectedValueOnce(new Error('Halaman antrean gagal'))
    fireEvent.click(screen.getByRole('button', { name: 'Muat lagi' }))
    await screen.findByText('Halaman antrean gagal')
    expect(screen.getByText('Audio fixture 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
    await screen.findByText('Audio fixture 48')
  })

  it('retries a failed refresh after deletion without allowing another mutation', async () => {
    render(<QueuePage />)
    await screen.findByText('Audio fixture 24')
    vi.mocked(playerApi.getQueueEntries).mockRejectedValueOnce(new Error('Refresh gagal'))
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Audio fixture 1 dari antrean' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Hapus Audio fixture 2 dari antrean' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui antrean' }))
    await screen.findByText('Audio fixture 25')
    expect(screen.queryByText('Audio fixture 1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hapus Audio fixture 2 dari antrean' })).toBeEnabled()
  })

  it('keeps the queue unchanged and reports a failed removal', async () => {
    render(<QueuePage />)
    await screen.findByText('Audio fixture 24')
    vi.mocked(playerApi.removeQueueEntry).mockRejectedValueOnce(new Error('Hapus gagal'))
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Audio fixture 1 dari antrean' }))
    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1))
    expect(screen.getAllByRole('listitem')).toHaveLength(24)
    expect(playerApi.getQueueEntries).toHaveBeenCalledTimes(1)
  })

  it('retries the first page and shows the empty state after deleting the last item', async () => {
    queue = [entry(1)]
    vi.mocked(playerApi.getQueueEntries).mockRejectedValueOnce(new Error('Antrean gagal'))
    render(<QueuePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Coba lagi' }))
    await screen.findByText('Audio fixture 1')
    fireEvent.click(within(screen.getByRole('list')).getByRole('button', { name: /Hapus/ }))
    await screen.findByText(/Antrean kosong/)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
