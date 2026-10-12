import { describe, expect, it } from 'vitest'

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/schemas/auth.schema'

describe('loginSchema', () => {
  it('menerima email dan password terisi', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'x' }).success).toBe(true)
  })

  it('menolak email tidak valid dan password kosong', () => {
    const result = loginSchema.safeParse({ email: 'bukan-email', password: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0])
      expect(fields).toContain('email')
      expect(fields).toContain('password')
    }
  })
})

describe('registerSchema', () => {
  const valid = {
    name: 'Gabriel',
    email: 'gabriel@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  }

  it('menerima data lengkap yang cocok', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('memangkas spasi di nama', () => {
    const result = registerSchema.safeParse({ ...valid, name: '  Gabriel  ' })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Gabriel')
  })

  it('menolak password lebih pendek dari 8 karakter', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'pendek', confirmPassword: 'pendek' })
    expect(result.success).toBe(false)
  })

  it('menolak konfirmasi yang tidak cocok', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Password456!' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'confirmPassword')).toBe(true)
    }
  })
})

describe('forgotPasswordSchema', () => {
  it('hanya butuh email valid', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true)
    expect(forgotPasswordSchema.safeParse({ email: 'salah' }).success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('menerima password baru yang cocok', () => {
    expect(
      resetPasswordSchema.safeParse({ newPassword: 'Password123!', confirmPassword: 'Password123!' })
        .success,
    ).toBe(true)
  })

  it('menolak konfirmasi yang tidak cocok', () => {
    expect(
      resetPasswordSchema.safeParse({ newPassword: 'Password123!', confirmPassword: 'lain' }).success,
    ).toBe(false)
  })
})
