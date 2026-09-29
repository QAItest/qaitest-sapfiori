import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TAG_TOKEN_RE = /(^|\s)@([A-Za-z0-9_:.-]+)(?=\s|$)/gim;
const ISSUE_KEY_RE = /^[A-Z][A-Z0-9_-]*-\d+$/i;

export function normalizeText(text: string): string {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\uFEFF/, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1)?.trim()) lines.pop();

  const compact: string[] = [];
  let previousBlank = false;
  for (const line of lines) {
    const isBlank = !line.trim();
    if (!isBlank || !previousBlank) compact.push(line);
    previousBlank = isBlank;
  }
  return `${compact.join("\n").trim()}\n`;
}

export function normalizeTagNames(text: string): string {
  return text.replace(
    TAG_TOKEN_RE,
    (_match, prefix: string, tag: string) => `${prefix}@${tag.replace(/:/g, "_")}`
  );
}

export function keepOnlySelectedTestTag(text: string, key = ""): string {
  if (!key) return text;
  const selected = key.toUpperCase();
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim().startsWith("@")) return line;
      return line
        .trim()
        .split(/\s+/)
        .filter((token) => {
          if (!token.startsWith("@")) return true;
          const tag = token.slice(1);
          return !ISSUE_KEY_RE.test(tag) || tag.toUpperCase() === selected;
        })
        .map((token) =>
          token.startsWith("@") && token.slice(1).toUpperCase() === selected
            ? `@${selected}`
            : token
        )
        .join(" ");
    })
    .filter(Boolean)
    .join("\n");
}

export function sanitizeFeatureText(
  text: string,
  key = "",
  convertOutline = false,
  dropFirstScenarioAfterTag = false
): string {
  void convertOutline;
  void dropFirstScenarioAfterTag;
  return normalizeText(keepOnlySelectedTestTag(normalizeTagNames(normalizeText(text)), key));
}

function argumentValue(args: string[], name: string): string {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
}

function main(): void {
  const args = process.argv.slice(2);
  const input = args.find((value) => !value.startsWith("--"));
  if (!input)
    throw new Error("Usage: test-sanitize <input.feature> [--output-file path] [--key KEY]");
  const inputPath = path.resolve(input);
  const outputPath = path.resolve(argumentValue(args, "--output-file") || inputPath);
  fs.writeFileSync(
    outputPath,
    sanitizeFeatureText(fs.readFileSync(inputPath, "utf8"), argumentValue(args, "--key"))
  );
  console.log(`Sanitized feature written to ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
