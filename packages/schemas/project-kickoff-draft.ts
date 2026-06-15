import { z } from "zod";
import { DEPARTMENT_VALUES } from "@repo/enums";
import type { ProjectKickoffExtraction } from "./project-kickoff-extraction";

/** Flat form draft used in workspace UI and save/update mutations */
export const projectKickoffDraftSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  department: z.enum(DEPARTMENT_VALUES).or(z.literal("")),
  projectOwners: z.string(),
  productDirection: z.string(),
  engineeringLead: z.string(),
  objectives: z.string().min(1, "Objectives are required"),
  platformEnables: z.string(),
  keyDeliverables: z.string(),
  risksAndBlockers: z.string(),
  raciMatrix: z.string(),
  timeline: z.string(),
  chosenTool: z.string(),
  techStack: z.string(),
  definitionOfDone: z.string(),
  additionalNotes: z.string(),
});

export type ProjectKickoffDraft = z.infer<typeof projectKickoffDraftSchema>;

function linesToArray(value: string): string[] | null {
  const items = value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function textToRaci(value: string) {
  if (!value.trim()) return null;
  const rows = value.split(/\n\n+/).map((block) => {
    const lines = block.split("\n");
    const area = lines[0]?.replace(/:$/, "").trim() ?? "";
    const pick = (prefix: string) => {
      const line = lines.find((l) => l.trim().startsWith(prefix));
      if (!line) return null;
      const rest = line.replace(new RegExp(`^\\s*${prefix}\\s*`), "").trim();
      return rest && rest !== "—" ? rest : null;
    };
    return {
      area,
      responsible: pick("R:"),
      accountable: pick("A:"),
      consulted: pick("C:"),
      informed: pick("I:"),
    };
  });
  return rows.length > 0 ? rows : null;
}

function textToTimeline(value: string) {
  if (!value.trim()) return null;
  const rows = value.split("\n").map((line) => {
    const match = line.match(/^(.+?)\s*—\s*(.+?)\s*\[(.+?)\]$/);
    if (!match) {
      return { milestone: line.trim(), targetDate: null, status: null };
    }
    const [, milestone, targetDate, status] = match;
    return {
      milestone: milestone?.trim() ?? line,
      targetDate: targetDate?.trim() === "TBD" ? null : (targetDate?.trim() ?? null),
      status: status?.trim() ?? null,
    };
  });
  return rows.length > 0 ? rows : null;
}

function textToDefinitionOfDone(value: string) {
  if (!value.trim()) return null;
  const blocks = value.split(/\n\n+/);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const milestone = lines[0]?.replace(/:$/, "").trim() ?? "";
    const criteria = lines
      .slice(1)
      .map((l) => l.replace(/^\s*•\s*/, "").trim())
      .filter(Boolean);
    return { milestone, criteria };
  });
}

/** Convert flat UI draft to structured extraction JSON for jsonb storage */
export function draftToStructured(draft: ProjectKickoffDraft): ProjectKickoffExtraction {
  return {
    projectName: draft.projectName.trim(),
    department: draft.department || null,
    projectOwners: linesToArray(draft.projectOwners),
    productDirection: linesToArray(draft.productDirection),
    engineeringLead: draft.engineeringLead.trim() || null,
    objectives: draft.objectives.trim() || null,
    platformEnables: linesToArray(draft.platformEnables),
    keyDeliverables: linesToArray(draft.keyDeliverables),
    risksAndBlockers: linesToArray(draft.risksAndBlockers),
    raciMatrix: textToRaci(draft.raciMatrix),
    timeline: textToTimeline(draft.timeline),
    chosenTool: draft.chosenTool.trim() || null,
    techStack: draft.techStack.trim() || null,
    definitionOfDone: textToDefinitionOfDone(draft.definitionOfDone),
    additionalNotes: draft.additionalNotes.trim(),
  };
}

function arrToLines(v: unknown): string {
  if (Array.isArray(v))
    return (v as unknown[]).filter(Boolean).map(String).join("\n");
  if (typeof v === "string") return v;
  return "";
}

function raciToText(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return (v as Record<string, unknown>[])
    .map(
      (row) =>
        `${String(row.area ?? "")}:\n  R: ${String(row.responsible ?? "—")}\n  A: ${String(row.accountable ?? "—")}\n  C: ${String(row.consulted ?? "—")}\n  I: ${String(row.informed ?? "—")}`,
    )
    .join("\n\n");
}

function timelineToText(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return (v as Record<string, unknown>[])
    .map(
      (row) =>
        `${String(row.milestone ?? "")} — ${String(row.targetDate ?? "TBD")} [${String(row.status ?? "?")}]`,
    )
    .join("\n");
}

function dodToText(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return (v as Record<string, unknown>[])
    .map((row) => {
      const criteria = Array.isArray(row.criteria)
        ? (row.criteria as unknown[]).map((c) => `  • ${String(c)}`).join("\n")
        : "";
      return `${String(row.milestone ?? "")}:\n${criteria}`;
    })
    .join("\n\n");
}

/** Build flat draft from structured extraction or DB row fields */
export function structuredToDraft(
  structured: ProjectKickoffExtraction | Record<string, unknown>,
): ProjectKickoffDraft {
  const o = structured as ProjectKickoffExtraction;
  return {
    projectName: o.projectName?.trim() ?? "",
    department: o.department ?? "",
    projectOwners: arrToLines(o.projectOwners),
    productDirection: arrToLines(o.productDirection),
    engineeringLead: o.engineeringLead ?? "",
    objectives: o.objectives ?? "",
    platformEnables: arrToLines(o.platformEnables),
    keyDeliverables: arrToLines(o.keyDeliverables),
    risksAndBlockers: arrToLines(o.risksAndBlockers),
    raciMatrix: raciToText(o.raciMatrix),
    timeline: timelineToText(o.timeline),
    chosenTool: o.chosenTool ?? "",
    techStack: o.techStack ?? "",
    definitionOfDone: dodToText(o.definitionOfDone),
    additionalNotes: o.additionalNotes ?? "",
  };
}

/** DB text columns from a flat draft */
export function draftToDbFields(draft: ProjectKickoffDraft) {
  return {
    projectName: draft.projectName.trim(),
    department: draft.department || null,
    projectOwners: draft.projectOwners.trim() || null,
    productDirection: draft.productDirection.trim() || null,
    engineeringLead: draft.engineeringLead.trim() || null,
    objectives: draft.objectives.trim(),
    platformEnables: draft.platformEnables.trim() || null,
    keyDeliverables: draft.keyDeliverables.trim() || null,
    risksAndBlockers: draft.risksAndBlockers.trim() || null,
    raciMatrix: draft.raciMatrix.trim() || null,
    timeline: draft.timeline.trim() || null,
    chosenTool: draft.chosenTool.trim() || null,
    techStack: draft.techStack.trim() || null,
    definitionOfDone: draft.definitionOfDone.trim() || null,
    additionalNotes: draft.additionalNotes.trim() || null,
  };
}

export const MATERIAL_KICKOFF_FIELDS = [
  "objectives",
  "department",
  "keyDeliverables",
  "risksAndBlockers",
  "timeline",
  "techStack",
  "definitionOfDone",
] as const;

export function hasMaterialKickoffChanges(
  before: ProjectKickoffDraft,
  after: ProjectKickoffDraft,
): boolean {
  return MATERIAL_KICKOFF_FIELDS.some(
    (key) => before[key].trim() !== after[key].trim(),
  );
}
