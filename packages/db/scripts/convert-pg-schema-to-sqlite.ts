/**
 * One-time migration: converts packages/db/schema.ts from pg-core to sqlite-core.
 * Run: bun run packages/db/scripts/convert-pg-schema-to-sqlite.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "schema.ts");
let src = readFileSync(schemaPath, "utf8");

const enumMap = new Map<string, string[]>();
const pgEnumRegex =
  /export const (\w+) = pgEnum\([\s\S]*?\[([\s\S]*?)\]\s*,?\s*\);/g;
let m: RegExpExecArray | null;
while ((m = pgEnumRegex.exec(src)) !== null) {
  const name = m[1]!;
  const values = [...m[2]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]!);
  enumMap.set(name, values);
}

src = src.replace(
  /import \{[\s\S]*?\} from "drizzle-orm\/pg-core";/,
  `import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";`,
);

src = src.replace(
  /\/\/ =+\n\/\/ ENUMS[\s\S]*?\/\/ =+\n\/\/ TABLES/,
  `// ENUMS — see enums.ts; SQLite uses text({ enum: [...] })

// TABLES`,
);

src = src.replace(/\bpgTable\b/g, "sqliteTable");
src = src.replace(/\bdoublePrecision\b/g, "real");
src = src.replace(/\bdecimal\(/g, "real(");
src = src.replace(/\bjsonb\(/g, "text(");
src = src.replace(/timestamp\("([^"]+)"\)/g, 'integer("$1", { mode: "timestamp" })');
src = src.replace(/boolean\("([^"]+)"\)/g, 'integer("$1", { mode: "boolean" })');

for (const [enumName, values] of enumMap) {
  const enumLiteral = `[${values.map((v) => `"${v}"`).join(", ")}] as const`;
  src = src.replace(
    new RegExp(`${enumName}\\("([^"]+)"\\)`, "g"),
    `text("$1", { enum: ${enumLiteral} })`,
  );
}

src = src.replace(/text\("([^"]+)"\)\.default\(\{/g, 'text("$1", { mode: "json" }).default({');
src = src.replace(/text\("([^"]+)"\)\.default\(\[/g, 'text("$1", { mode: "json" }).default([');
src = src.replace(/export type \w+Value = \(typeof \w+Enum\.enumValues\)\[number\];\n\n?/g, "");

writeFileSync(schemaPath, src);
console.log(`Converted schema.ts with ${enumMap.size} enum mappings`);
