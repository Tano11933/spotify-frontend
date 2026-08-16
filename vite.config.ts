import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Harus sinkron dengan "paths" di tsconfig.app.json.
      // Vite yang resolve saat bundling, TypeScript yang resolve saat type-check.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
