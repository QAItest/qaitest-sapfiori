import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.SAP_BASE_URL ||
  "https://ui5.sap.com/test-resources/sap/m/demokit/worklist/webapp/index.html";
const useSapLogin =
  process.env.SAP_AUTO_LOGIN !== "false" &&
  Boolean(process.env.SAP_USERNAME && process.env.SAP_PASSWORD);

export default defineConfig({
  testDir: "./tests/specs",
  outputDir: "reports/artifacts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/html", open: "never" }],
    ["json", { outputFile: "reports/results.json" }],
    ["junit", { outputFile: "reports/junit.xml" }]
  ],
  use: {
    baseURL,
    headless: process.env.PW_HEADLESS !== "false",
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: process.env.ACCEPT_INSECURE_CERTS === "true",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  ...(useSapLogin
    ? {
        sapConfig: {
          url: baseURL,
          username: process.env.SAP_USERNAME!,
          password: process.env.SAP_PASSWORD!
        }
      }
    : {}),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
