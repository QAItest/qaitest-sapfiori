import "dotenv/config";
import { cpus } from "node:os";
import { resolve } from "node:path";
import type { wdi5Authenticator, wdi5Config } from "wdio-ui5-service";

const isHeadless = process.argv.includes("--headless") || process.env.HEADLESS === "true";
const isDebug = process.argv.includes("--debug");
const maxInstances = Number(
  process.env.MAX_INSTANCES || Math.max(1, Math.floor(cpus().length / 2))
);
const authProvider = process.env.WDI5_AUTH_PROVIDER?.trim();

function authentication(): wdi5Authenticator | undefined {
  switch (authProvider) {
    case undefined:
    case "":
      return undefined;
    case "BTP":
      return {
        provider: "BTP",
        ...(process.env.WDI5_IDP_DOMAIN ? { idpDomain: process.env.WDI5_IDP_DOMAIN } : {})
      };
    case "BasicAuth":
      return { provider: "BasicAuth" };
    case "Office365":
      return { provider: "Office365" };
    case "custom":
      return { provider: "custom" };
    default:
      throw new Error(`Unsupported WDI5_AUTH_PROVIDER: ${authProvider}`);
  }
}

const auth = authentication();
type FioriCapability = WebdriverIO.Capabilities & {
  "wdi5:authentication"?: wdi5Authenticator;
};

const capability: FioriCapability = {
  browserName: process.env.BROWSER || "chrome",
  acceptInsecureCerts: process.env.ACCEPT_INSECURE_CERTS === "true",
  "goog:chromeOptions": {
    args: isHeadless
      ? ["headless", "disable-gpu", "no-sandbox", "window-size=1440,900"]
      : ["window-size=1440,900"]
  },
  ...(auth ? { "wdi5:authentication": auth } : {})
};

export const config: wdi5Config = {
  baseUrl:
    process.env.BASE_URL ||
    "https://ui5.sap.com/test-resources/sap/m/demokit/worklist/webapp/index.html",
  specs: ["./tests/features/**/*.feature"],
  maxInstances,
  capabilities: [capability],
  services: ["ui5"],
  framework: "cucumber",
  reporters: [
    "spec",
    [
      "cucumberjs-json",
      {
        jsonFolder: resolve("reports", "cucumber"),
        language: "en",
        reportFilePerRetry: true
      }
    ]
  ],
  logLevel: (process.env.LOG_LEVEL as wdi5Config["logLevel"]) || "error",
  bail: 0,
  waitforTimeout: Number(process.env.WAIT_TIMEOUT || 30000),
  connectionRetryTimeout: isDebug ? 1_200_000 : 120_000,
  connectionRetryCount: 3,
  cucumberOpts: {
    require: ["./tests/steps/**/*.ts", "./tests/support/**/*.ts"],
    backtrace: false,
    dryRun: false,
    failFast: false,
    snippets: true,
    source: true,
    strict: true,
    tagExpression: process.env.TAGS || "not @ignore",
    timeout: isDebug ? 600_000 : 60_000,
    ignoreUndefinedDefinitions: false
  },
  wdi5: {
    screenshotPath: resolve("reports", "screenshots"),
    logLevel: process.env.WDI5_LOG_LEVEL === "verbose" ? "verbose" : "error",
    waitForUI5Timeout: Number(process.env.UI5_TIMEOUT || 30000),
    btpWorkZoneEnablement: process.env.WDI5_WORKZONE === "true"
  },
  outputDir: resolve("reports", "wdio")
};
