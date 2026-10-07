import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // the browser only talks to Vite; Vite forwards /api calls to our API,
    // so cookies stay first-party (same idea as the Vercel rewrite later)
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});