import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          database: ['dexie', 'dexie-react-hooks'],
          zip: ['jszip'],
          ui: ['lucide-react', 'motion'],
        },
      },
    },
  },
  server: {
    // HMR can be disabled in Google AI Studio with DISABLE_HMR=true.
    hmr: process.env.DISABLE_HMR !== 'true',
    // Disable file watching with HMR to reduce CPU use during agent edits.
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
