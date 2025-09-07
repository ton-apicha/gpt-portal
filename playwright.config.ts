import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	retries: 0,
	use: {
		baseURL: 'http://localhost:3000',
		headless: true,
	},
})
