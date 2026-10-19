import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SONG_ROW_HEIGHT, computeVirtualRange, useVirtualList } from '@/hooks/useVirtualList'

describe('computeVirtualRange', () => {
  it('mengembalikan rentang kosong untuk daftar kosong', () => {
    expect(computeVirtualRange(0, 300, 0, SONG_ROW_HEIGHT)).toEqual({
      start: 0,
      end: 0,
      offsetY: 0,
      totalHeight: 0,
    })
  })

  it('merender dari awal saat scrollTop masih 0', () => {
    const range = computeVirtualRange(0, 300, 100, 60, 2)

    // visibleCount = 5, overscan 2 → 0..7
    expect(range.start).toBe(0)
    expect(range.end).toBe(7)
    expect(range.offsetY).toBe(0)
    expect(range.totalHeight).toBe(6000)
  })

  it('menggeser window saat digulir dan menyisakan overscan', () => {
    const range = computeVirtualRange(600, 300, 100, 60, 2)

    // firstVisible = 10, start = 8, end = 10 + 5 + 2 = 17
    expect(range.start).toBe(8)
    expect(range.end).toBe(17)
    expect(range.offsetY).toBe(480)
  })

  it('membatasi end pada jumlah item', () => {
    const range = computeVirtualRange(10_000, 300, 20, 60, 4)

    expect(range.end).toBe(20)
  })

  it('merender semua baris sebelum container terukur', () => {
    const range = computeVirtualRange(0, 0, 12, 60, 4)

    expect(range.end).toBe(12)
  })
})

function Harness({ count }: { count: number }) {
  const { containerRef, onScroll, start, end } = useVirtualList(count, 60, 1)

  return (
    <div ref={containerRef} data-testid="scroll" onScroll={onScroll}>
      <span data-testid="range">{`${start}-${end}`}</span>
    </div>
  )
}

describe('useVirtualList', () => {
  it('menghitung ulang window saat container digulir', () => {
    render(<Harness count={20} />)

    // jsdom tidak punya layout, jadi dimensi container diatur manual.
    const element = screen.getByTestId('scroll')
    Object.defineProperty(element, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(element, 'scrollTop', { value: 600, writable: true, configurable: true })

    fireEvent.scroll(element)

    // firstVisible = 10, visibleCount = 5, overscan 1 → 9..16
    expect(screen.getByTestId('range')).toHaveTextContent('9-16')
  })
})
