import { defineConfig } from 'vite'
import { adex } from 'adex'
import preact from '@preact/preset-vite'

export default defineConfig({
  build: {
    target: 'node16',
  },
  plugins: [adex(), preact()],
})
