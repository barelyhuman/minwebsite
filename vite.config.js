import { defineConfig } from 'vite'
import { adex } from 'adex'
import { providers } from 'adex/fonts'
import preact from '@preact/preset-vite'

export default defineConfig({
  build: {
    target: 'node18',
  },
  plugins: [
    adex({
      fonts: {
        providers: [providers.bunny()],
        families: [
          {
            name: 'Bad Script',
            weights: ['400'],
          },
          {
            name: 'Inter',
            weights: ['400'],
            styles: ['normal'],
          },
        ],
      },
    }),
    preact(),
  ],
})
