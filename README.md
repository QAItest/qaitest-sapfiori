# qaitest-sapfiori

Open-source QA automation template for SAP Fiori, UI5, and SAP WebGUI applications.

Recommended software combo:

- [Playwright SAP](https://playwright-sap.dev/) for SAP-aware browser automation
- Playwright Test for execution, assertions, isolation, tracing, and reports
- TypeScript for maintainable tests and page objects
- Gherkin feature files for business-readable test definitions
- Xray for Jira for optional traceability and execution publishing
- GitHub Actions, GitLab CI, or Jenkins for continuous execution

The repository is framework-first: it contains no internal infrastructure, hardcoded business
data, mandatory CI provider, or committed credentials.

## What this repository provides

- Playwright SAP installed through the documented `@playwright/test` npm alias
- SAP-aware UI5 locators: `getByRoleUI5()` and `locateUI5()`
- SAP WebGUI locators: `locateSID()` and `getByRoleSID()`
- optional automatic SAP login through `sapConfig`
- a reusable SAP Fiori page object
- Gherkin and executable test examples mapped with an Xray key
- HTML, JSON, JUnit, screenshot, video, and trace artifacts
- an Xray-oriented result summary
- CI templates for GitHub Actions, GitLab CI, and Jenkins

## Prerequisites

- Node.js 20 or newer
- Chrome or the Playwright Chromium browser
- access to the target SAP application
- a technical test user when authentication is required

## Installation

```bash
npm install
npm run install:browsers
cp .env.example .env
```

Set `SAP_BASE_URL` in `.env`. Keep credentials outside Git. The default URL points to SAP's public
SAPUI5 Worklist demo, so the smoke test can run without credentials.

## Run tests

```bash
npm test
npm run test:smoke
npm run test:headed
npm run test:debug
npm run test:ui
npm run typecheck
```

To record a flow with SAP-aware code generation:

```bash
npm run codegen -- "$SAP_BASE_URL"
```

On PowerShell:

```powershell
npm run codegen -- $env:SAP_BASE_URL
```

## Project layout

```text
qaitest-sapfiori/
|-- CI/
|-- reports/
|-- tests/
|   |-- features/
|   |-- page-objects/
|   `-- specs/
|-- utils/
|-- .env.example
|-- package.json
|-- playwright.config.ts
`-- tsconfig.json
```

## SAP-aware locators

Prefer semantic properties over volatile generated DOM IDs:

```ts
await page.getByRoleUI5("Button", { text: "Save" }).click();
await page.getByRoleUI5("Input", { label: "Customer" }).fill("1000");
await page.locateUI5("//IconTabFilter[2]").click();
```

For SAP WebGUI, use SID locators:

```ts
await page.locateSID("wnd[0]/usr/ctxtRSYST-BNAME").fill("USER");
await page.getByRoleSID("Button", { name: "Log On" }).click();
```

Use ordinary Playwright locators only for plain HTML around the SAP application.

## Authentication

When `SAP_USERNAME` and `SAP_PASSWORD` are present, the configuration enables Playwright SAP's
automatic `sapConfig` login. Disable it explicitly with `SAP_AUTO_LOGIN=false`.

```dotenv
SAP_BASE_URL=https://my-system.example.com/sap/bc/ui2/flp
SAP_USERNAME=test-user
SAP_PASSWORD=secret
SAP_AUTO_LOGIN=true
```

Credentials must come from the local environment or the CI secret store.

## Gherkin and Xray

Feature files live in `tests/features/`; executable Playwright tests live in `tests/specs/`.
Use the same test key in both artifacts:

```gherkin
@TEST-101 @smoke @sap-fiori
Scenario: The Fiori application starts
```

```ts
test("[TEST-101] @smoke SAP Fiori application starts", async ({ page }) => {
  // test implementation
});
```

Playwright writes machine-readable results to `reports/results.json` and JUnit output to
`reports/junit.xml`. Generate a compact Xray-oriented summary with:

```bash
npm run report:summary
```

Publishing remains optional because Xray Cloud and Data Center use different endpoints. Perform
the upload in CI and store the Xray credentials in the CI secret store.

## Reports and diagnostics

- `reports/html/`: Playwright HTML report
- `reports/results.json`: complete JSON result
- `reports/junit.xml`: JUnit result for CI/Xray adapters
- `reports/artifacts/`: screenshots, videos, and traces

Open the last HTML report with `npm run report:open`.

## CI

Ready-to-adapt examples live in `CI/`. They install Chromium, validate TypeScript, run the suite,
and retain `reports/` even when a test fails.

## License

MIT
