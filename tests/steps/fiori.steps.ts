import { Given, Then } from "@wdio/cucumber-framework";
import { browser, expect } from "@wdio/globals";
import type { wdi5Selector } from "wdio-ui5-service";

Given("I open the SAP Fiori application", async () => {
  const currentUrl = await browser.getUrl();
  await expect(currentUrl).toMatch(/^https?:\/\//);
});

Then("the UI5 runtime should be available", async () => {
  const hasUi5 = await browser.execute(() => {
    const candidate = globalThis as typeof globalThis & {
      sap?: { ui?: object };
    };
    return typeof candidate.sap?.ui === "object";
  });

  await expect(hasUi5).toBe(true);
});

Then(/^at least one UI5 control of type "([^"]+)" should exist$/, async (controlType: string) => {
  const selector: wdi5Selector = { selector: { controlType } };
  const controls = await browser.allControls(selector);

  await expect(controls.length).toBeGreaterThan(0);
});
