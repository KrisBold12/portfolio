/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// In production nginx serves the built files and forwards /api to the
// container, so the browser only ever sees one origin. These two blocks are
// that arrangement reproduced locally: `server` for the dev server, `preview`
// for the built bundle. Without the second one the production build cannot be
// exercised against the API before it is deployed, which is the last chance to
// catch a difference between what the dev server does and what ships.
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
