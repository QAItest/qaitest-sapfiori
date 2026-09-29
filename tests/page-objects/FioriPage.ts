import type { Locator, Page } from "@playwright/test";

export class FioriPage {
  constructor(private readonly page: Page) {}

  async open(path = ""): Promise<void> {
    await this.page.goto(path);
  }

  ui5Control(role: string, properties?: Record<string, string>): Locator {
    return this.page.getByRoleUI5(role, properties);
  }

  ui5Path(path: string): Locator {
    return this.page.locateUI5(path);
  }

  webGuiSid(sid: string): Locator {
    return this.page.locateSID(sid);
  }
}
