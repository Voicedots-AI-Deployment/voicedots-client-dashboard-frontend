import { defineConfig } from '@playwright/test';
const port=Number(process.env.ERP_TEST_PORT||5191);
export default defineConfig({ testDir: './tests', fullyParallel: true, use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' }, webServer: { command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI } });
