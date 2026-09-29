import { browser } from "@wdio/globals";
import type { wdi5Selector } from "wdio-ui5-service";

export class FioriPage {
  async open(hash = ""): Promise<void> {
    await browser.url(hash ? `/#${hash.replace(/^#/, "")}` : "/");
  }

  async control(selector: wdi5Selector): Promise<unknown> {
    return browser.asControl(selector);
  }

  async controls(selector: wdi5Selector): Promise<unknown[]> {
    return browser.allControls(selector);
  }
}

export const fioriPage = new FioriPage();
