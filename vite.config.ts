import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  cacheDir: process.env.VOICEDOTS_VITE_CACHE_DIR,
  envDir: process.env.VOICEDOTS_LOCAL_ENV_DIR,
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
