import fs from "node:fs";
import path from "node:path";

export type SecretDict = Record<string, unknown>;

function normalizeMapping(value: unknown): SecretDict {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object / dictionary payload.");
  }
  return value as SecretDict;
}

export function getSecretDict(secretId: string): SecretDict {
  if (secretId.startsWith("env:")) {
    const envName = secretId.slice(4);
    const raw = (process.env[envName] || "").trim();
    if (!raw) throw new Error(`Environment variable '${envName}' is empty or undefined.`);
    return normalizeMapping(JSON.parse(raw));
  }

  if (secretId.startsWith("file:")) {
    const filePath = path.resolve(secretId.slice(5));
    if (!fs.existsSync(filePath)) throw new Error(`Secret file not found: ${filePath}`);
    return normalizeMapping(JSON.parse(fs.readFileSync(filePath, "utf8")));
  }

  const envValue = (process.env[secretId] || "").trim();
  if (envValue) return normalizeMapping(JSON.parse(envValue));

  const candidate = path.resolve(secretId);
  if (fs.existsSync(candidate)) {
    return normalizeMapping(JSON.parse(fs.readFileSync(candidate, "utf8")));
  }

  throw new Error(`Secret could not be resolved from env or file: ${secretId}`);
}
