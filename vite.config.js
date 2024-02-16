import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  root: './client',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4532',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  plugins: [
    preact({
      prerender: true
    })
  ]
})
