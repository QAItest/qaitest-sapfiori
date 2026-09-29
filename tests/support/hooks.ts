import { After } from "@wdio/cucumber-framework";
import { browser } from "@wdio/globals";
import fs from "node:fs";
import path from "node:path";

After(async function (scenario) {
  if (scenario.result?.status === "FAILED") {
    const safeName = scenario.pickle.name.replace(/[^A-Za-z0-9._-]+/g, "-");
    const screenshotDirectory = path.resolve("reports", "screenshots");
    fs.mkdirSync(screenshotDirectory, { recursive: true });
    await browser.saveScreenshot(path.join(screenshotDirectory, `${safeName}.png`));
  }
});
