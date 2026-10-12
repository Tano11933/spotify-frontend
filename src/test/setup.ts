import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React Testing Library hanya membersihkan DOM otomatis kalau `globals`
// diaktifkan. Project ini memakai import eksplisit (tanpa globals), jadi
// cleanup-nya didaftarkan manual di sini.
afterEach(() => {
  cleanup()
})
