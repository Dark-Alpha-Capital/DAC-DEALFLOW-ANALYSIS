import fs from "node:fs";
import path from "node:path";

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const appDir = path.join(process.cwd(), "app");
const files = walk(appDir);

for (const file of files) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;

  s = s.replace(/^import type \{ Metadata \} from "next";\n/m, "");
  s = s.replace(/^import \{ Metadata \} from "next";\n/m, "");
  s = s.replace(/^import type \{ Metadata \} from 'next';\n/m, "");
  s = s.replace(/^import \{ Metadata \} from 'next';\n/m, "");

  s = s.replace(
    /^export const metadata: Metadata = \{[\s\S]*?\n\};\n/m,
    "",
  );

  s = s.replace(
    /^export async function generateMetadata\([\s\S]*?\n\}\n/m,
    "",
  );

  if (s !== orig) {
    fs.writeFileSync(file, s);
    console.log("stripped", path.relative(process.cwd(), file));
  }
}
