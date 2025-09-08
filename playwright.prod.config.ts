import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	testIgnore: ['tests/unit/**'],
	retries: 0,
	use: {
		baseURL: 'http://localhost:3030',
		headless: true,
	},
	webServer: {
		command: 'npm run dev',
		port: 3030,
		reuseExistingServer: true,
		timeout: 180000,
		env: {
			PORT: '3030',
			NODE_ENV: 'development',
		},
	},
})


