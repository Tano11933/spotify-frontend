import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/cn'

describe('cn', () => {
  it('menggabungkan className yang diberikan', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('membuang nilai falsy', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('mengembalikan string kosong kalau tidak ada yang tersisa', () => {
    expect(cn(false, undefined)).toBe('')
  })
})
