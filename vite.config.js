import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this as a project site at /pomodoro-app/, not at the
  // domain root — only rewrite the base when the CI workflow builds for Pages,
  // so local dev/build/preview keep working unprefixed.
  base: process.env.GITHUB_PAGES ? '/pomodoro-app/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Self-hosted fonts ship as woff2 (modern browsers) + woff (fallback)
      // across several unicode subsets; only woff2 is precached, and only
      // the subsets this app actually renders (latin + latin-ext, for the
      // English UI and any Turkish task names) — Fontsource bundles
      // cyrillic/greek/vietnamese too, which would otherwise triple the
      // offline cache for glyphs the app never displays.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/*-cyrillic-*', '**/*-greek-*', '**/*-vietnamese-*'],
      },
      manifest: {
        name: 'Pomodoro Technique',
        short_name: 'Pomodoro',
        description: "A digital implementation of Francesco Cirillo's Pomodoro Technique.",
        theme_color: '#2b3a2e',
        background_color: '#2b3a2e',
        display: 'standalone',
        icons: [
          { src: 'favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
