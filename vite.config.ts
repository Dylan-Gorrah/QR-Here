import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => ({
  base: '/QR-Here/',
  plugins: [react(), ...(mode === 'phone' ? [basicSsl()] : [])],
}))
