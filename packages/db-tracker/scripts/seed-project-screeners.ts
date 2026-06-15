/**
 * Seed one Project Screener template per department.
 */
import { createId } from "@paralleldrive/cuid2";
import { DEPARTMENT_VALUES } from "@repo/enums";

const DEFAULT_CONTENT = `Evaluate whether this internal project is worth the firm's time and resources.

Consider:
- Strategic alignment with firm priorities
- Expected ROI and time-to-value
- Resource requirements vs. capacity
- Risks and dependencies
- Clarity of objectives and definition of done

Score 0–5 (0.5 increments): 0 = reject, 5 = strongly approve.`;

async function main() {
  const databaseName = process.env.TRACKER_D1_DATABASE_NAME ?? "project-trackers-db";
  const trackerAppDir = new URL("../../../apps/project-trackers", import.meta.url).pathname;

  for (const department of DEPARTMENT_VALUES) {
    const id = createId();
    const name = `${department} Project Screener`;
    const now = Date.now();
    const sql = `INSERT OR IGNORE INTO ScreenerTemplate (id, name, category, description, content, department, createdAt, updatedAt) VALUES ('${id}', '${name.replace(/'/g, "''")}', 'Project Screener', 'Default evaluation rubric', '${DEFAULT_CONTENT.replace(/'/g, "''")}', '${department.replace(/'/g, "''")}', ${now}, ${now});`;

    const proc = Bun.spawn(
      ["bun", "x", "wrangler", "d1", "execute", databaseName, "--remote", `--command=${sql}`],
      {
        cwd: trackerAppDir,
        stdout: "inherit",
        stderr: "inherit",
      },
    );
    const code = await proc.exited;
    if (code !== 0) {
      console.error(`Failed to seed screener for ${department}`);
      process.exit(code);
    }
  }

  console.log(`Seeded project screeners for ${DEPARTMENT_VALUES.length} departments.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
