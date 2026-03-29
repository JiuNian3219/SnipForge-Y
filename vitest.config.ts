import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
    },
    resolve: {
        // Don't let vite-plugin-electron-renderer intercept Node built-ins
        conditions: ['node'],
    },
})
