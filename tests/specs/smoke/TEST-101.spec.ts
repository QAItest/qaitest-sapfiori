import { expect, test } from "@playwright/test";
import { FioriPage } from "../../page-objects/FioriPage.js";

test("[TEST-101] @smoke SAP Fiori application exposes a UI5 search control", async ({ page }) => {
  const fiori = new FioriPage(page);

  await fiori.open();
  await expect(page).toHaveTitle(/Worklist/i);
  await expect(fiori.ui5Control("SearchField")).toBeVisible();
});
