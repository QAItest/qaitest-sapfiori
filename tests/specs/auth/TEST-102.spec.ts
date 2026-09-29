import { expect, test } from "@playwright/test";
import { SapAuth, sapAuthOptionsFromEnvironment } from "../../page-objects/SapAuth.js";

const authOptions = sapAuthOptionsFromEnvironment();
const automaticLoginEnabled = process.env.SAP_AUTO_LOGIN !== "false" && Boolean(authOptions);
const hasLogoutStrategy = Boolean(
  process.env.SAP_LOGOUT_URL ||
  process.env.SAP_LOGOUT_ACTION_SELECTOR ||
  process.env.SAP_LOGOUT_ACTION_PROPERTIES
);

test("[TEST-102] @auth SAP Fiori user can log in and log out", async ({ page }) => {
  test.skip(!authOptions, "SAP_BASE_URL, SAP_USERNAME and SAP_PASSWORD are required.");
  test.skip(automaticLoginEnabled, "Use npm run test:auth to disable automatic login.");
  test.skip(
    !hasLogoutStrategy,
    "Configure SAP_LOGOUT_URL, SAP_LOGOUT_ACTION_SELECTOR or SAP_LOGOUT_ACTION_PROPERTIES."
  );

  const auth = new SapAuth(page, authOptions!);

  await auth.login();
  await expect(page).not.toHaveURL("about:blank");

  await auth.logout();
  await expect(page).not.toHaveURL("about:blank");
});
