const { defineConfig } = require("@playwright/test");
const path = require("node:path");
const port = Number(process.env.DIAGCALC_PORT || 8097);
module.exports = defineConfig({
  testDir: "test/browser",
  timeout: 45000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 3,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
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
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    env: {
      DIAGCALC_PORT: String(port),
      DIAGCALC_SITE_ROOT: process.env.DIAGCALC_SITE_ROOT || path.join(__dirname, "public"),
    },
  },
});
