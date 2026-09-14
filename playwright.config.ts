import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', fullyParallel: true, use: { baseURL: 'http://127.0.0.1:5191', trace: 'retain-on-failure' }, webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5191', url: 'http://127.0.0.1:5191', reuseExistingServer: !process.env.CI } });
