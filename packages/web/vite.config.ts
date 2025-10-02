import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const CORE_SRC = path.resolve(r('./'), '../../core/src');
const PARSER_SRC = path.resolve(r('./'), '../../parser/src');
const TSA_SRC = path.resolve(r('./'), '../../tsa/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@motor/core', replacement: path.join(CORE_SRC, 'index.ts') },
      { find: '@motor/parser', replacement: path.join(PARSER_SRC, 'index.ts') },
      { find: '@motor/tsa', replacement: path.join(TSA_SRC, 'index.ts') },
      { find: /^@motor\/core\/(.*)$/, replacement: (_m, p1) => path.join(CORE_SRC, p1) },
      { find: /^@motor\/parser\/(.*)$/, replacement: (_m, p1) => path.join(PARSER_SRC, p1) },
      { find: /^@motor\/tsa\/(.*)$/, replacement: (_m, p1) => path.join(TSA_SRC, p1) },
    ],
  },
  optimizeDeps: {
    exclude: ['@motor/core', '@motor/parser', '@motor/tsa'],
  },
  server: {
    fs: {
      allow: [
        fileURLToPath(new URL('../../..', import.meta.url)),
        fileURLToPath(new URL('../..', import.meta.url)),
        fileURLToPath(new URL('.', import.meta.url)),
      ],
    },
  },
});
