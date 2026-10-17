import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Vitest menyalakan flag ini saat menjalankan test; dipakai untuk melewatkan
// plugin yang hanya berguna saat build/dev.
const isTest = process.env.VITEST === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // React Compiler dan Tailwind tidak mengubah hasil test, hanya menambah
    // waktu transform. Di test keduanya dilewati.
    ...(isTest ? [] : [babel({ presets: [reactCompilerPreset()] }), tailwindcss()]),
  ],
  resolve: {
    alias: {
      // Harus sinkron dengan "paths" di tsconfig.app.json.
      // Vite yang resolve saat bundling, TypeScript yang resolve saat type-check.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Komponen diuji di DOM tiruan jsdom, bukan browser sungguhan.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Test hidup berdampingan dengan kode di folder yang sama.
    include: ['src/**/*.test.{ts,tsx}'],
    // CSS tidak diproses di test: komponen tidak mengimpornya (hanya main.tsx),
    // dan menjalankan Tailwind hanya memperlambat tanpa mengubah hasil.
    css: false,
    // Mock/spy dipulihkan otomatis antar test supaya tidak bocor.
    restoreMocks: true,
    // Default env untuk test. `src/lib/env.ts` memvalidasi env saat module
    // dimuat, dan file .env TIDAK ikut ke git (gitignored) sehingga checkout
    // bersih (CI) tidak punya nilainya. Test tidak boleh bergantung pada file
    // lokal, jadi nilainya diberikan di sini.
    env: {
      VITE_API_BASE_URL: 'http://localhost:9000',
      VITE_WS_URL: 'ws://127.0.0.1:9000/ws',
    },
  },
})
