import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // index.html is in the root
  publicDir: 'public', // make sure this is lowercase and correct
  build: {
    outDir: 'dist',
  },
});
