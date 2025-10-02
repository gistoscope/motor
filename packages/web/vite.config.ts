import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@motor/core': path.resolve(__dirname, '../../core/src'),
      '@motor/parser': path.resolve(__dirname, '../../parser/src'),
      '@motor/tsa': path.resolve(__dirname, '../../tsa/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@motor/core', '@motor/parser', '@motor/tsa'],
  },
});
