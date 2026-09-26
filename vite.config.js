import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs: itch.io serves HTML5 games from a hashed subdirectory
  // (https://html.itch.zone/html/<id>/), so absolute "/assets/..." paths 404.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
