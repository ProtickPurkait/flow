import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Note: no service-worker/PWA plugin. vite-plugin-pwa's workbox bundler
// writes absolute file:// import paths into the generated service worker,
// which breaks on any project path containing an apostrophe (as this one
// does) -- and the spec's "Customer PWA" surface just means the mobile
// customer-facing app, not an explicit offline/installable requirement.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-gsap': ['gsap'],
        },
      },
    },
  },
})
