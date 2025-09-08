import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	testIgnore: ['tests/unit/**'],
	retries: 0,
	use: {
		baseURL: 'http://localhost:3000',
		headless: true,
	},
	webServer: {
		command: 'npm run dev',
		port: 3000,
		reuseExistingServer: true,
		timeout: 120000,
	},
})
