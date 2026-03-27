import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
