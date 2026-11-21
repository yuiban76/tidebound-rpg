import { defineConfig } from 'vite'

export default defineConfig({
  root: 'apps/web',
  base: './',
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { proxy: { '/local': 'http://127.0.0.1:4173' } },
})
