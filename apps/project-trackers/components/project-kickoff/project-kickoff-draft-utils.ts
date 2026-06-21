import type { ProjectKickoffDraft } from "@repo/schemas";

export type ReviewDraft = {
  projectName: string;
  department: string;
  projectOwners: string;
  productDirection: string;
  engineeringLead: string;
  objectives: string;
  platformEnables: string;
  keyDeliverables: string;
  risksAndBlockers: string;
  raciMatrix: string;
  timeline: string;
  chosenTool: string;
  techStack: string;
  definitionOfDone: string;
  additionalNotes: string;
};

export type WorkflowStep = 1 | 2 | 3;

function arrToLines(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String).join("\n");
  }
  if (typeof value === "string") return value;
  return "";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function raciToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return (value as Record<string, unknown>[])
    .map(
      (row) =>
        `${str(row.area)}:\n  R: ${str(row.responsible) || "—"}\n  A: ${str(row.accountable) || "—"}\n  C: ${str(row.consulted) || "—"}\n  I: ${str(row.informed) || "—"}`,
    )
    .join("\n\n");
}

function timelineToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return (value as Record<string, unknown>[])
    .map(
      (row) =>
        `${str(row.milestone)} — ${str(row.targetDate) || "TBD"} [${str(row.status) || "?"}]`,
    )
    .join("\n");
}

function dodToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return (value as Record<string, unknown>[])
    .map((row) => {
      const criteria = Array.isArray(row.criteria)
        ? row.criteria.map((c) => `  • ${String(c)}`).join("\n")
        : "";
      return `${str(row.milestone)}:\n${criteria}`;
    })
    .join("\n\n");
}

export function extractionToDraft(
  object: Record<string, unknown>,
): ReviewDraft | null {
  const projectName =
    typeof object.projectName === "string" ? object.projectName.trim() : "";
  if (!projectName) return null;

  return {
    projectName,
    department: str(object.department),
    projectOwners: arrToLines(object.projectOwners),
    productDirection: arrToLines(object.productDirection),
    engineeringLead: str(object.engineeringLead),
    objectives: str(object.objectives),
    platformEnables: arrToLines(object.platformEnables),
    keyDeliverables: arrToLines(object.keyDeliverables),
    risksAndBlockers: arrToLines(object.risksAndBlockers),
    raciMatrix: raciToText(object.raciMatrix),
    timeline: timelineToText(object.timeline),
    chosenTool: str(object.chosenTool),
    techStack: str(object.techStack),
    definitionOfDone: dodToText(object.definitionOfDone),
    additionalNotes: str(object.additionalNotes),
  };
}

export function collectStep2ValidationMessages(draft: ReviewDraft): string[] {
  const messages: string[] = [];
  if (!draft.projectName.trim()) {
    messages.push("Please enter a project name.");
  }
  if (!draft.objectives.trim()) {
    messages.push("Please enter project objectives.");
  }
  return messages;
}

export function isDraftReady(draft: ReviewDraft): boolean {
  return collectStep2ValidationMessages(draft).length === 0;
}

export function invalidFieldClass(
  highlight: boolean,
  fieldInvalid: boolean,
): string | undefined {
  return highlight && fieldInvalid
    ? "ring-2 ring-destructive border-destructive"
    : undefined;
}

export const SUMMARY_FIELDS: {
  key: keyof ReviewDraft;
  label: string;
  mono?: boolean;
}[] = [
  { key: "projectName", label: "Project name" },
  { key: "department", label: "Department" },
  { key: "projectOwners", label: "Project owners" },
  { key: "engineeringLead", label: "Engineering lead" },
  { key: "productDirection", label: "Product direction" },
  { key: "chosenTool", label: "Chosen tool" },
  { key: "techStack", label: "Tech stack" },
  { key: "objectives", label: "Objectives" },
  { key: "platformEnables", label: "Platform enables" },
  { key: "keyDeliverables", label: "Key deliverables" },
  { key: "raciMatrix", label: "RACI matrix", mono: true },
  { key: "risksAndBlockers", label: "Risks & blockers" },
  { key: "timeline", label: "Timeline", mono: true },
  { key: "definitionOfDone", label: "Definition of done" },
  { key: "additionalNotes", label: "Additional notes" },
];

export type ReviewFieldConfig = {
  key: keyof ReviewDraft;
  label: string;
  type: "input" | "textarea" | "department";
  required?: boolean;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
  colSpan?: 1 | 2;
};

export const REVIEW_FIELD_SECTIONS: {
  title: string;
  fields: ReviewFieldConfig[];
}[] = [
  {
    title: "Overview",
    fields: [
      {
        key: "projectName",
        label: "Project name",
        type: "input",
        required: true,
        colSpan: 2,
      },
      {
        key: "department",
        label: "Department",
        type: "department",
        colSpan: 2,
      },
      {
        key: "projectOwners",
        label: "Project owners",
        type: "input",
        placeholder: "Comma-separated names",
      },
      {
        key: "engineeringLead",
        label: "Engineering lead",
        type: "input",
      },
      {
        key: "productDirection",
        label: "Product direction",
        type: "input",
        placeholder: "Comma-separated names",
        colSpan: 2,
      },
      {
        key: "chosenTool",
        label: "Chosen tool / board",
        type: "input",
      },
      {
        key: "techStack",
        label: "Tech stack",
        type: "input",
      },
    ],
  },
  {
    title: "Scope & delivery",
    fields: [
      {
        key: "objectives",
        label: "Objectives",
        type: "textarea",
        required: true,
        rows: 4,
        colSpan: 2,
      },
      {
        key: "platformEnables",
        label: "Platform enables",
        type: "textarea",
        placeholder: "One item per line",
        rows: 5,
        colSpan: 2,
      },
      {
        key: "keyDeliverables",
        label: "Key deliverables",
        type: "textarea",
        placeholder: "One item per line",
        rows: 5,
        colSpan: 2,
      },
      {
        key: "raciMatrix",
        label: "RACI matrix",
        type: "textarea",
        rows: 8,
        mono: true,
        colSpan: 2,
      },
      {
        key: "risksAndBlockers",
        label: "Risks & blockers",
        type: "textarea",
        placeholder: "One item per line",
        rows: 4,
        colSpan: 2,
      },
      {
        key: "timeline",
        label: "High-level timeline",
        type: "textarea",
        rows: 6,
        mono: true,
        colSpan: 2,
      },
      {
        key: "definitionOfDone",
        label: "Definition of done",
        type: "textarea",
        rows: 6,
        colSpan: 2,
      },
      {
        key: "additionalNotes",
        label: "Additional notes / future work",
        type: "textarea",
        rows: 3,
        colSpan: 2,
      },
    ],
  },
];

export function toKickoffDraft(draft: ReviewDraft): ProjectKickoffDraft {
  return draft as ProjectKickoffDraft;
}
