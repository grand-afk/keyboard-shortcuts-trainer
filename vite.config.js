import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ──────────────────────────────────────────────────────────────────────────────
// Set BASE to your GitHub Pages path so assets resolve correctly.
//
// Your repo is:  https://github.com/grand-afk/keydeck
// GitHub Pages:  https://grand-afk.github.io/keydeck/
//
// Keep base as '/' if you later use a custom domain (e.g. keydeck.io).
// ──────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react()],
  base: '/keydeck/',
  test: {
    // Pure unit tests — no DOM required for sm2.js or backup.js
    environment: 'node',
  },
})
