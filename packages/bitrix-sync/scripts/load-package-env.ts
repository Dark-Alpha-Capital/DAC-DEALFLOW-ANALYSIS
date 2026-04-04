/**
 * Loads `packages/bitrix-sync/.env` then `.env.local` (local overrides) into `process.env`.
 * Resolves paths from this file’s location so it works when cwd is the monorepo root.
 * Variables already set in the environment (e.g. shell export, CI) are never overwritten.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptsDir, "..");

function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fromEnv = parseEnvFile(join(packageRoot, ".env"));
const fromLocal = parseEnvFile(join(packageRoot, ".env.local"));
const merged = { ...fromEnv, ...fromLocal };

for (const [key, val] of Object.entries(merged)) {
  if (process.env[key] === undefined) {
    process.env[key] = val;
  }
}
