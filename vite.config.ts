import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
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
    // Only the normal (multi-file) build needs this — the singlefile build
    // has no separate asset requests to resolve.
    base: isSingleFile ? '/' : '/overtime/',
    build: {
      // keep the two build modes from overwriting each other
      outDir: isSingleFile ? 'dist-singlefile' : 'dist',
    },
  };
});