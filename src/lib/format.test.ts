import { describe, expect, it } from 'vitest'

import { formatDuration, formatRelativeTime, formatYear, greetingForHour } from '@/lib/format'

describe('formatDuration', () => {
  it('memformat detik menjadi m:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(3600)).toBe('60:00')
  })

  it('menangani nilai tidak masuk akal tanpa error', () => {
    expect(formatDuration(-1)).toBe('0:00')
    expect(formatDuration(Number.NaN)).toBe('0:00')
  })
})

describe('formatYear', () => {
  it('mengambil tahun dari timestamp RFC3339', () => {
    expect(formatYear('2024-03-05T00:00:00Z')).toBe('2024')
  })

  it('mengembalikan tanda hubung untuk tanggal tidak valid', () => {
    expect(formatYear('bukan-tanggal')).toBe('-')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-12T10:00:00Z')

  it('memakai satuan yang sesuai jaraknya', () => {
    expect(formatRelativeTime('2026-10-12T09:59:30Z', now)).toBe('baru saja')
    expect(formatRelativeTime('2026-10-12T09:45:00Z', now)).toBe('15 menit lalu')
    expect(formatRelativeTime('2026-10-12T07:00:00Z', now)).toBe('3 jam lalu')
    expect(formatRelativeTime('2026-10-10T10:00:00Z', now)).toBe('2 hari lalu')
  })

  it('mengembalikan pesan jelas untuk tanggal tidak valid', () => {
    expect(formatRelativeTime('bukan-tanggal', now)).toBe('Waktu tidak diketahui')
  })
})

describe('greetingForHour', () => {
  it('mengganti sapaan mengikuti jam', () => {
    expect(greetingForHour(7)).toBe('Selamat pagi')
    expect(greetingForHour(12)).toBe('Selamat siang')
    expect(greetingForHour(17)).toBe('Selamat sore')
    expect(greetingForHour(21)).toBe('Selamat malam')
  })

  it('memakai batas jam yang benar', () => {
    expect(greetingForHour(10)).toBe('Selamat pagi')
    expect(greetingForHour(11)).toBe('Selamat siang')
    expect(greetingForHour(15)).toBe('Selamat sore')
    expect(greetingForHour(18)).toBe('Selamat malam')
  })
})
