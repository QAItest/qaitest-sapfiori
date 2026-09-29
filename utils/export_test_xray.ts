import "dotenv/config";
import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { sanitizeFeatureText } from "./gherkin_sanitizer.js";
import { getSecretDict } from "./secret_loader.js";

type JsonRecord = Record<string, unknown>;
type LabelsByKey = Record<string, string[]>;

const SECRET_ID = process.env.TEST_MANAGEMENT_SECRET_ID || "";
const PROJECT_KEY = process.env.XRAY_PROJECT_KEY || process.env.TEST_PROJECT_KEY || "";
const AUTH_URL = (process.env.TEST_MGMT_AUTH_URL || "").trim();
const GRAPHQL_URL = (process.env.TEST_MGMT_GRAPHQL_URL || "").trim();
const EXPORT_URL = (process.env.TEST_MGMT_EXPORT_URL || "").trim();
const OUTPUT_DIR = path.resolve(process.env.FEATURE_OUTPUT_DIR || "tests/features");
const ISSUE_KEY_RE = /[A-Z][A-Z0-9_-]*-\d+/i;
const IGNORED_FOR_FOLDER = new Set(["cucumber", "env:appium", "env_appium"]);

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => !!item && typeof item === "object")
    : [];
}

function loadCredentials(): Record<string, string> {
  const resolved = SECRET_ID ? getSecretDict(SECRET_ID) : {};
  const credentials: Record<string, string> = {};
  for (const key of [
    "TEST_MGMT_CLIENT_ID",
    "TEST_MGMT_CLIENT_SECRET",
    "XRAY_CLIENT_ID",
    "XRAY_CLIENT_SECRET"
  ]) {
    const value = process.env[key] || resolved[key];
    if (value) credentials[key] = String(value);
  }
  return credentials;
}

async function getToken(): Promise<string> {
  if (!AUTH_URL) return "";
  const credentials = loadCredentials();
  const clientId = credentials.TEST_MGMT_CLIENT_ID || credentials.XRAY_CLIENT_ID;
  const clientSecret = credentials.TEST_MGMT_CLIENT_SECRET || credentials.XRAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing client credentials for Xray export.");

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
  });
  if (!response.ok) throw new Error(`Authentication failed with HTTP ${response.status}`);
  return (await response.text()).trim().replace(/^"|"$/g, "");
}

async function graphql(token: string, query: string, variables: JsonRecord): Promise<JsonRecord> {
  if (!GRAPHQL_URL) throw new Error("TEST_MGMT_GRAPHQL_URL is not configured.");
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  const payload = (await response.json()) as JsonRecord;
  if (!response.ok || payload.errors) {
    throw new Error(`GraphQL request failed: ${JSON.stringify(payload.errors || payload)}`);
  }
  return (payload.data as JsonRecord) || {};
}

async function getProjectId(token: string): Promise<string> {
  const data = await graphql(
    token,
    "query($key:String!){getProjectSettings(projectIdOrKey:$key){projectId}}",
    { key: PROJECT_KEY }
  );
  return String((data.getProjectSettings as JsonRecord).projectId);
}

async function listGherkinKeys(token: string, projectId: string): Promise<LabelsByKey> {
  const query =
    'query($projectId:String,$limit:Int!,$start:Int,$tt:TestTypeInput){getTests(projectId:$projectId,testType:$tt,limit:$limit,start:$start){total start results{jira(fields:["key","labels"])}}}';
  const mapping: LabelsByKey = {};
  let start = 0;
  const limit = 100;

  while (true) {
    const data = await graphql(token, query, {
      projectId,
      limit,
      start,
      tt: { kind: "Gherkin" }
    });
    const block = (data.getTests as JsonRecord) || {};
    const results = records(block.results);
    for (const item of results) {
      const jira = (item.jira as JsonRecord) || {};
      const fields = (jira.fields as JsonRecord) || {};
      const key = String(jira.key || fields.key || "");
      const rawLabels = jira.labels || fields.labels || [];
      if (key) mapping[key] = Array.isArray(rawLabels) ? [...new Set(rawLabels.map(String))] : [];
    }
    start = Number(block.start || 0) + results.length;
    if (start >= Number(block.total || start)) break;
  }
  return mapping;
}

function extractKey(name: string): string {
  return path.basename(name).match(ISSUE_KEY_RE)?.[0]?.toUpperCase() || "";
}

function pickFunctionalLabel(labels: string[]): string {
  const label = labels.find((item) => item && !IGNORED_FOR_FOLDER.has(item.toLowerCase()));
  return (label || "unlabeled").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._-]+|[._-]+$/g, "");
}

function featuresFromZip(zip: AdmZip): Array<[string, string]> {
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.endsWith(".feature"))
    .map((entry) => [entry.entryName, entry.getData().toString("utf8")]);
}

function loadLocalFeatures(source: string): Array<[string, string]> {
  const sourcePath = path.resolve(source);
  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    const output: Array<[string, string]> = [];
    const walk = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else if (entry.name.endsWith(".feature")) {
          output.push([path.relative(sourcePath, fullPath), fs.readFileSync(fullPath, "utf8")]);
        }
      }
    };
    walk(sourcePath);
    return output.sort(([left], [right]) => left.localeCompare(right));
  }
  if (sourcePath.toLowerCase().endsWith(".zip")) return featuresFromZip(new AdmZip(sourcePath));
  if (sourcePath.toLowerCase().endsWith(".json")) {
    return records(JSON.parse(fs.readFileSync(sourcePath, "utf8")))
      .map(
        (item) =>
          [String(item.path || item.name || "unknown.feature"), String(item.content || "")] as [
            string,
            string
          ]
      )
      .filter(([name]) => name.endsWith(".feature"));
  }
  throw new Error("Unsupported local source. Use a directory, .zip file, or JSON manifest.");
}

async function fetchFeature(token: string, key: string): Promise<string> {
  const localSource = (process.env.FEATURE_SOURCE_PATH || "").trim();
  if (localSource) {
    const match = loadLocalFeatures(localSource).find(([name]) => {
      const candidate = extractKey(name) || path.parse(name).name.toUpperCase();
      return candidate === key;
    });
    return match?.[1] || "";
  }
  if (!EXPORT_URL) throw new Error("Set FEATURE_SOURCE_PATH or TEST_MGMT_EXPORT_URL.");

  const url = new URL(EXPORT_URL);
  url.searchParams.set("keys", key);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error(`Feature export failed with HTTP ${response.status}`);
  if ((response.headers.get("content-type") || "").includes("application/zip")) {
    const entries = featuresFromZip(new AdmZip(Buffer.from(await response.arrayBuffer())));
    return entries.find(([name]) => extractKey(name) === key)?.[1] || entries[0]?.[1] || "";
  }
  return response.text();
}

function parseKeys(value: string): string[] {
  return value
    .split(/[,\s;]+/)
    .map((item) => item.trim().toUpperCase())
    .filter((item) => ISSUE_KEY_RE.test(item));
}

function parseArguments(args: string[]): {
  keys: string[];
  domains: string[];
  requireAppium: boolean;
} {
  const keys: string[] = [];
  const domains: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (["--key", "--keys"].includes(value)) {
      while (args[index + 1] && !args[index + 1].startsWith("--")) {
        keys.push(...parseKeys(args[++index]));
      }
    } else if (value === "--keys-file") {
      keys.push(
        ...fs
          .readFileSync(args[++index], "utf8")
          .split(/\r?\n/)
          .filter((line) => line.trim() && !line.trim().startsWith("#"))
          .flatMap(parseKeys)
      );
    } else if (value === "--domains") {
      while (args[index + 1] && !args[index + 1].startsWith("--")) domains.push(args[++index]);
    }
  }
  return {
    keys: [...new Set(keys)],
    domains,
    requireAppium: args.includes("--require-env-appium")
  };
}

async function main(): Promise<void> {
  let { keys, domains, requireAppium } = parseArguments(process.argv.slice(2));
  if (!keys.length) throw new Error("No keys resolved. Use --keys, --key, or --keys-file.");

  let token = "";
  const labels: LabelsByKey = Object.fromEntries(keys.map((key) => [key, []]));
  if (GRAPHQL_URL && PROJECT_KEY) {
    token = await getToken();
    try {
      Object.assign(labels, await listGherkinKeys(token, await getProjectId(token)));
    } catch (error) {
      console.warn(`[export][warn] Could not resolve labels: ${String(error)}`);
    }
  }

  if (requireAppium) {
    keys = keys.filter((key) =>
      labels[key]?.some((label) => ["env:appium", "env_appium"].includes(label.toLowerCase()))
    );
  }
  if (domains.length) {
    keys = keys.filter((key) => {
      const lower = labels[key]?.map((label) => label.toLowerCase()) || [];
      return domains.some((domain) =>
        lower.some((label) =>
          [
            domain.toLowerCase(),
            `domain:${domain.toLowerCase()}`,
            `domain_${domain.toLowerCase()}`
          ].includes(label)
        )
      );
    });
  }
  if (!keys.length) throw new Error("No provided keys match the requested filters.");

  let written = 0;
  for (const key of keys) {
    const raw = await fetchFeature(token, key);
    if (!raw) {
      console.warn(`[export][warn] No feature content found for key ${key}`);
      continue;
    }
    const directory = path.join(OUTPUT_DIR, pickFunctionalLabel(labels[key] || []));
    fs.mkdirSync(directory, { recursive: true });
    const outputPath = path.join(directory, `${key}.feature`);
    fs.writeFileSync(outputPath, sanitizeFeatureText(raw, key));
    console.log(`[export] wrote -> ${outputPath}`);
    written += 1;
  }
  console.log(`Done. Wrote ${written} feature file(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
