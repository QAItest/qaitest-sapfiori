import { expect, type Page } from "@playwright/test";

export interface SapAuthOptions {
  baseURL: string;
  username: string;
  password: string;
  logoutUrl?: string;
  logoutMenuSelector?: string;
  logoutActionSelector?: string;
  logoutMenuRole: string;
  logoutMenuProperties: Record<string, string>;
  logoutActionRole: string;
  logoutActionProperties: Record<string, string>;
  authenticatedUrlPattern?: RegExp;
  loggedOutUrlPattern?: RegExp;
}

function parseProperties(
  value: string | undefined,
  fallback: Record<string, string>,
  variableName: string
): Record<string, string> {
  if (!value) return fallback;

  const parsed: unknown = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${variableName} must contain a JSON object.`);
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, propertyValue]) => [key, String(propertyValue)])
  );
}

function parsePattern(value: string | undefined, variableName: string): RegExp | undefined {
  if (!value) return undefined;

  try {
    return new RegExp(value);
  } catch (error) {
    throw new Error(`${variableName} is not a valid regular expression.`, { cause: error });
  }
}

export function sapAuthOptionsFromEnvironment(): SapAuthOptions | undefined {
  const { SAP_BASE_URL: baseURL, SAP_USERNAME: username, SAP_PASSWORD: password } = process.env;
  if (!baseURL || !username || !password) return undefined;

  return {
    baseURL,
    username,
    password,
    logoutUrl: process.env.SAP_LOGOUT_URL,
    logoutMenuSelector: process.env.SAP_LOGOUT_MENU_SELECTOR,
    logoutActionSelector: process.env.SAP_LOGOUT_ACTION_SELECTOR,
    logoutMenuRole: process.env.SAP_LOGOUT_MENU_ROLE || "Button",
    logoutMenuProperties: parseProperties(
      process.env.SAP_LOGOUT_MENU_PROPERTIES,
      { icon: "sap-icon://person-placeholder" },
      "SAP_LOGOUT_MENU_PROPERTIES"
    ),
    logoutActionRole: process.env.SAP_LOGOUT_ACTION_ROLE || "Button",
    logoutActionProperties: parseProperties(
      process.env.SAP_LOGOUT_ACTION_PROPERTIES,
      { text: "Sign Out" },
      "SAP_LOGOUT_ACTION_PROPERTIES"
    ),
    authenticatedUrlPattern: parsePattern(
      process.env.SAP_AUTHENTICATED_URL_PATTERN,
      "SAP_AUTHENTICATED_URL_PATTERN"
    ),
    loggedOutUrlPattern: parsePattern(
      process.env.SAP_LOGGED_OUT_URL_PATTERN,
      "SAP_LOGGED_OUT_URL_PATTERN"
    )
  };
}

export class SapAuth {
  constructor(
    private readonly page: Page,
    private readonly options: SapAuthOptions
  ) {}

  async login(): Promise<void> {
    await this.page.SAPLogin(this.options.username, this.options.password, this.options.baseURL);
    await this.page.waitForLoadState("domcontentloaded");

    if (this.options.authenticatedUrlPattern) {
      await expect(this.page).toHaveURL(this.options.authenticatedUrlPattern);
    }
  }

  async logout(): Promise<void> {
    if (this.options.logoutUrl) {
      await this.page.goto(this.options.logoutUrl);
    } else {
      const menu = this.options.logoutMenuSelector
        ? this.page.locator(this.options.logoutMenuSelector)
        : this.page.getByRoleUI5(this.options.logoutMenuRole, this.options.logoutMenuProperties);
      await menu.click();

      const action = this.options.logoutActionSelector
        ? this.page.locator(this.options.logoutActionSelector)
        : this.page.getByRoleUI5(
            this.options.logoutActionRole,
            this.options.logoutActionProperties
          );
      await action.click();
    }

    await this.page.waitForLoadState("domcontentloaded");
    if (this.options.loggedOutUrlPattern) {
      await expect(this.page).toHaveURL(this.options.loggedOutUrlPattern);
    }
  }
}
