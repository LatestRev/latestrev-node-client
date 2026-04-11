import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
    test: {
        testTimeout: 30000,
        env: loadEnv('', process.cwd(), ''),
    },
});
