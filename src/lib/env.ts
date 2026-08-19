import { envSchema } from '@/schemas/env.schema'

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  throw new Error(
    `Konfigurasi environment tidak valid:\n${details}\n\n` +
      'Pastikan file .env sudah ada di root project (salin dari .env.example), ' +
      'lalu RESTART dev server — Vite hanya membaca .env saat startup.',
  )
}

export const env = parsed.data
