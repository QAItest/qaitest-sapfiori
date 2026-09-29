import fs from "node:fs";
import path from "node:path";
import { buildXraySummary } from "./xray-summary.js";

function argumentValue(args: string[], name: string): string {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
}

const args = process.argv.slice(2);
const report = path.resolve(argumentValue(args, "--file") || "reports/results.json");
if (!fs.existsSync(report)) {
  console.warn(`Report not found: ${report}`);
  process.exit(0);
}

const requestedOutput = argumentValue(args, "--output-file");
const output = requestedOutput
  ? path.resolve(requestedOutput)
  : path.join(path.dirname(report), `${path.parse(report).name}.summary.json`);

console.log(`Summary written to ${buildXraySummary(report, output)}`);
