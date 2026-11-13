import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,woff}'] },
      manifest: {
        name: 'SopaVentura',
        short_name: 'SopaVentura',
        description: 'Sopa de letras para dos',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1d1b2e',
        theme_color: '#1d1b2e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
});
