import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : entry.name.endsWith(".json") ? [fullPath] : [];
  });
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => !!item && typeof item === "object")
    : [];
}

const reportRoot = path.resolve(process.argv[2] || "reports/cucumber");
const outputPath = path.resolve(process.argv[3] || "reports/xray-summary.json");
const keys = new Set<string>();
const counts = { passed: 0, failed: 0, skipped: 0 };

for (const reportFile of walk(reportRoot)) {
  const features = records(JSON.parse(fs.readFileSync(reportFile, "utf8")));
  for (const feature of features) {
    for (const scenario of records(feature.elements)) {
      const statuses = records(scenario.steps).map((step) => {
        const result = step.result as JsonRecord | undefined;
        return String(result?.status || "skipped").toLowerCase();
      });
      const status = statuses.includes("failed")
        ? "failed"
        : statuses.length > 0 && statuses.every((item) => item === "passed")
          ? "passed"
          : "skipped";
      counts[status] += 1;

      for (const tag of records(scenario.tags)) {
        const name = String(tag.name || "").replace(/^@/, "");
        if (/^[A-Z][A-Z0-9_-]*-\d+$/.test(name)) keys.add(name);
      }
    }
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      projectKey: process.env.XRAY_PROJECT_KEY || "",
      testKeys: [...keys].sort(),
      statusCount: counts
    },
    null,
    2
  )
);
console.log(`Xray-oriented summary written to ${outputPath}`);
