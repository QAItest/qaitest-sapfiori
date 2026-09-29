import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type JsonRecord = Record<string, unknown>;

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => !!item && typeof item === "object")
    : [];
}

export function buildXraySummary(reportPathArg: string, outputPathArg: string): string {
  const reportPath = path.resolve(reportPathArg);
  const outputPath = path.resolve(outputPathArg);
  if (!fs.existsSync(reportPath))
    throw new Error(`Playwright JSON report not found: ${reportPath}`);

  const keys = new Set<string>();
  const labels = new Set<string>();
  const failedTests: string[] = [];
  const counts = { passed: 0, failed: 0, skipped: 0 };
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as JsonRecord;

  const visitSuite = (suite: JsonRecord): void => {
    for (const spec of records(suite.specs)) {
      const title = String(spec.title || "");
      for (const key of title.match(/\b[A-Z][A-Z0-9_-]*-\d+\b/g) || []) keys.add(key);
      for (const label of title.match(/@[A-Za-z0-9_.-]+/g) || []) labels.add(label.slice(1));

      for (const test of records(spec.tests)) {
        const results = records(test.results);
        const finalStatus = String(results.at(-1)?.status || "skipped");
        if (finalStatus === "passed") counts.passed += 1;
        else if (finalStatus === "skipped") counts.skipped += 1;
        else {
          counts.failed += 1;
          failedTests.push(title);
        }
      }
    }
    for (const child of records(suite.suites)) visitSuite(child);
  };
  for (const suite of records(report.suites)) visitSuite(suite);

  const payload = {
    report: reportPath,
    features_dir: process.env.FEATURES_DIR || "tests/features",
    date: new Date().toISOString().slice(0, 10),
    project_key: process.env.XRAY_PROJECT_KEY || process.env.TEST_PROJECT_KEY || "",
    labels: [...labels].sort(),
    test_count: counts.passed + counts.failed + counts.skipped,
    jira_keys: [...keys].sort(),
    status_count: counts,
    failed_tests: failedTests
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = buildXraySummary(
    process.argv[2] || "reports/results.json",
    process.argv[3] || "reports/xray-summary.json"
  );
  console.log(`Xray-oriented summary written to ${output}`);
}
