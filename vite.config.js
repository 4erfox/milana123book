// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

function copyStaticPublicFiles() {
  return {
    name: 'copy-static-public-files',
    closeBundle() {
      const sourceRoot = path.resolve(__dirname, 'public');
      const outRoot = path.resolve(__dirname, 'public', 'dist');
      const foldersToCopy = ['docs', 'data', 'images', 'assets'];

      if (!fs.existsSync(outRoot)) return;

      for (const folder of foldersToCopy) {
        const src = path.join(sourceRoot, folder);
        const dst = path.join(outRoot, folder);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dst, { recursive: true });
        }
      }

      const faviconSrc = path.join(sourceRoot, 'favicon.png');
      if (fs.existsSync(faviconSrc)) {
        fs.copyFileSync(faviconSrc, path.join(outRoot, 'favicon.png'));
      }

      const version = {
        version: process.env.npm_package_version || '0.0.0',
        buildTime: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(outRoot, 'version.json'), JSON.stringify(version, null, 2), 'utf8');
      fs.writeFileSync(path.join(outRoot, '.nojekyll'), '', 'utf8');

      const indexOut = path.join(outRoot, 'index.html');
      const fallbackOut = path.join(outRoot, '404.html');
      if (fs.existsSync(indexOut)) {
        fs.copyFileSync(indexOut, fallbackOut);
      }

      // Удаляем admin/ из dist — не должна попадать на публичный деплой
      const adminDist = path.join(outRoot, 'admin');
      if (fs.existsSync(adminDist)) {
        fs.rmSync(adminDist, { recursive: true });
      }
    },
  };
}

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
  plugins: [copyStaticPublicFiles()],
});