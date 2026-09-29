import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => !!item && typeof item === "object")
    : [];
}

const reportPath = path.resolve(process.argv[2] || "reports/results.json");
const outputPath = path.resolve(process.argv[3] || "reports/xray-summary.json");
const keys = new Set<string>();
const counts = { passed: 0, failed: 0, skipped: 0 };

if (!fs.existsSync(reportPath)) {
  throw new Error(`Playwright JSON report not found: ${reportPath}`);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as JsonRecord;
const visitSuite = (suite: JsonRecord): void => {
  for (const spec of records(suite.specs)) {
    const title = String(spec.title || "");
    for (const key of title.match(/\b[A-Z][A-Z0-9_-]*-\d+\b/g) || []) keys.add(key);

    for (const test of records(spec.tests)) {
      const results = records(test.results);
      const finalStatus = String(results.at(-1)?.status || "skipped");
      if (finalStatus === "passed") counts.passed += 1;
      else if (finalStatus === "skipped") counts.skipped += 1;
      else counts.failed += 1;
    }
  }
  for (const child of records(suite.suites)) visitSuite(child);
};

for (const suite of records(report.suites)) {
  visitSuite(suite);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      report: reportPath,
      projectKey: process.env.XRAY_PROJECT_KEY || "",
      testKeys: [...keys].sort(),
      statusCount: counts
    },
    null,
    2
  )
);
console.log(`Xray-oriented summary written to ${outputPath}`);
