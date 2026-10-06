import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const isSingleFile = mode === 'singlefile';

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isSingleFile ? [viteSingleFile()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // GitHub Pages serves this repo from /overtime/, not the domain root.
    // Only the normal (multi-file) production build needs this — the
    // singlefile build inlines assets and the dev server runs at "/".
    base: isSingleFile ? '/' : (mode === 'production' ? '/overtime/' : '/'),
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    },
    build: {
      outDir: isSingleFile ? 'dist-singlefile' : 'dist',
    },
  };
});