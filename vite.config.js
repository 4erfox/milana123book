// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

const publicDir = path.resolve(__dirname, 'public');
const pagesDir = path.resolve(publicDir, 'pages');
const pageEntries = fs.existsSync(pagesDir)
  ? fs.readdirSync(pagesDir)
      .filter((name) => name.endsWith('.html'))
      .map((name) => path.join(pagesDir, name))
  : [];

export default defineConfig({
  root: 'public',
  publicDir: false,
  base: '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7778',
        changeOrigin: true,
      },
    },
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, 'admin'),
        publicDir,
      ],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: [
        path.join(publicDir, 'index.html'),
        ...pageEntries,
      ],
    },
  },
  optimizeDeps: {
    exclude: ['admin-panel.js', 'bridge.js'],
  },
});