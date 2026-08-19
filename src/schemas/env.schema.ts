import { z } from 'zod'

export const envSchema = z.object({
  VITE_API_BASE_URL: z
    .url('VITE_API_BASE_URL harus berupa URL lengkap, contoh: http://localhost:9000')
    .transform((value) => value.replace(/\/+$/, '')),

  VITE_WS_URL: z
    .string()
    .refine(
      (value) => value.startsWith('ws://') || value.startsWith('wss://'),
      'VITE_WS_URL harus diawali ws:// atau wss://',
    ),
})

export type Env = z.infer<typeof envSchema>
