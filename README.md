# qaitest-sapfiori

Open-source QA automation template for SAP Fiori and UI5 applications.

Recommended software combo:

- `wdi5` for UI5-aware end-to-end automation
- `WebdriverIO` as the browser runner
- `Cucumber` and Gherkin for business-readable BDD scenarios
- `Xray for Jira` for optional test traceability and execution publishing
- GitHub Actions, GitLab CI, or Jenkins for continuous execution

The repository is framework-first: it contains no internal infrastructure, hardcoded business
data, mandatory CI provider, or committed credentials.

## What this repository provides

- TypeScript configuration for WebdriverIO 9 and wdi5 3
- UI5-aware control selection through `browser.asControl()` and `browser.allControls()`
- Gherkin feature and step-definition examples
- a reusable page-object base
- screenshots on failed scenarios
- Cucumber JSON reports and an Xray-oriented summary
- CI templates for GitHub Actions, GitLab CI, and Jenkins
- optional wdi5 authentication configuration for Fiori Launchpad, BTP, and Work Zone

## Prerequisites

- Node.js 20 or newer
- Chrome or Chromium
- access to the SAP Fiori/UI5 application under test
- a technical test user when authentication is required

## Installation

```bash
npm install
cp .env.example .env
```

Set `BASE_URL` in `.env`. Keep credentials outside Git. The default URL points to SAP's public
SAPUI5 Worklist demo, so the included smoke test can be tried without credentials.

## Run tests

```bash
npm test
npm run test:headed
npm run test:debug
npm run test:smoke
npm run typecheck
```

Select scenarios with a Cucumber expression:

```bash
TAGS="@smoke and not @ignore" npm test
```

On PowerShell:

```powershell
$env:TAGS = "@smoke and not @ignore"
npm test
```

## Project layout

```text
qaitest-sapfiori/
|-- CI/
|-- reports/
|-- tests/
|   |-- features/
|   |-- page-objects/
|   |-- steps/
|   `-- support/
|-- utils/
|-- .env.example
|-- package.json
|-- tsconfig.json
`-- wdio.conf.ts
```

## Writing a Fiori test

Keep business intent in `tests/features/` and UI5 selectors in step definitions or page objects.
Prefer stable UI5 IDs and semantic selectors over generated DOM IDs or CSS paths.

```ts
const saveButton = await browser.asControl({
  selector: {
    id: "saveButton",
    viewName: "my.company.app.view.ObjectPage",
    controlType: "sap.m.Button"
  }
});

await saveButton.press();
```

Useful selector fields include `id`, `viewName`, `controlType`, `bindingPath`, `properties`,
`ancestor`, and `descendant`.

## Authentication

wdi5 reads the user and password from `wdi5_username` and `wdi5_password`. Set
`WDI5_AUTH_PROVIDER` only when an authentication provider is needed. For SAP BTP, also set the
identity-provider domain when required:

```dotenv
WDI5_AUTH_PROVIDER=BTP
WDI5_IDP_DOMAIN=my-tenant.accounts.ondemand.com
wdi5_username=user@example.com
wdi5_password=secret
```

Set `WDI5_WORKZONE=true` for a Work Zone scenario. Provider-specific behavior belongs in a
dedicated configuration file once the target landscape is known.

## Xray for Jira

Tag managed scenarios with their Jira/Xray test key:

```gherkin
@TEST-101 @smoke @sap-fiori
Scenario: Open the Fiori application
```

Cucumber JSON files are written to `reports/cucumber/`. Generate a compact, Xray-oriented
summary with:

```bash
npm run report:summary
```

Publishing remains optional and should be implemented in CI against the Xray deployment used by
the team (Cloud or Data Center). Store `XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET` in the CI secret
store.

## CI

Ready-to-adapt examples live in `CI/`. All examples:

1. install dependencies with `npm ci`;
2. run TypeScript validation;
3. execute the headless wdi5 suite;
4. retain `reports/` even when a test fails.

## SAP testing scope

This template targets system-level browser journeys. In the tested UI5 application itself, keep
QUnit for unit tests and OPA5 for component/integration journeys. wdi5 complements those layers by
testing deployed Fiori applications, Launchpad integration, and authenticated end-to-end flows.

## License

MIT
