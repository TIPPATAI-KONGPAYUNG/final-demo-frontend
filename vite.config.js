import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://ramon-unturbulent-allotropically.ngrok-free.dev',
        changeOrigin: true,
        secure: false, // ถ้า ngrok เป็น HTTPS self-signed
      },
    },
  },
})
