const { defineConfig } = require("@playwright/test");
const path = require("node:path");
module.exports = defineConfig({
  testDir: "test/browser",
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 3,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8097",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium", launchOptions: process.env.DIAGCALC_BROWSER_EXECUTABLE ? { executablePath: process.env.DIAGCALC_BROWSER_EXECUTABLE } : {} } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "node scripts/serve-site.js",
    url: "http://127.0.0.1:8097",
    reuseExistingServer: !process.env.CI,
    env: { DIAGCALC_SITE_ROOT: process.env.DIAGCALC_SITE_ROOT || path.join(__dirname, "public") },
  },
});
