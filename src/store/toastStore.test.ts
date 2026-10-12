import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useToastStore } from '@/store/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    // Toast menghapus dirinya lewat setTimeout 4 detik; timer palsu membuat
    // perilaku itu bisa diuji tanpa menunggu sungguhan.
    vi.useFakeTimers()
    useToastStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('menambahkan toast dan mengembalikan id', () => {
    const id = useToastStore.getState().push({ title: 'Halo', variant: 'info' })

    expect(id).toBeTruthy()
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0]?.title).toBe('Halo')
  })

  it('menyimpan maksimal tiga toast terakhir', () => {
    for (let index = 1; index <= 4; index += 1) {
      useToastStore.getState().push({ title: `Toast ${index}`, variant: 'info' })
    }

    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual([
      'Toast 2',
      'Toast 3',
      'Toast 4',
    ])
  })

  it('menghapus toast otomatis setelah 4 detik', () => {
    useToastStore.getState().push({ title: 'Sementara', variant: 'success' })

    vi.advanceTimersByTime(4000)

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('clear mengosongkan semua toast', () => {
    useToastStore.getState().push({ title: 'A', variant: 'info' })
    useToastStore.getState().push({ title: 'B', variant: 'info' })

    useToastStore.getState().clear()

    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
