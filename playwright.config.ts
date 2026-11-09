import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: "http://localhost:3100",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3100",
    url: "http://localhost:3100/api/auth/providers",
    reuseExistingServer: false,
    timeout: 120000,
    env: { NEXTAUTH_URL: "http://localhost:3100", RUN_EXPIRY_WORKER: "true" },
  },
});
