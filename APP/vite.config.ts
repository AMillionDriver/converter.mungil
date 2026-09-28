import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // @jsquash ships .wasm binaries; tell Rollup to treat them as assets
      // so they get emitted alongside the bundle and served with the correct MIME.
      output: {
        assetFileNames: {
          // Keep WASM files at the root of the build output for easy fetching
          ['wasm']: 'wasm/[name][extname]',
          // Everything else (images, fonts, etc.) grouped by type
          default: 'assets/[name]-[hash][extname]',
        },
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle @jsquash so its .wasm assets are discovered early
    include: ['@jsquash/jpeg', '@jsquash/png', '@jsquash/webp'],
  },
});
