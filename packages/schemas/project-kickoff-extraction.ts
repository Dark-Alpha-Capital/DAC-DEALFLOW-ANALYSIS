import { z } from "zod";
import { DEPARTMENT_VALUES } from "@repo/db/enums";

/**
 * OpenAI structured-output mode requires `required` to list every property.
 * Do not use `.optional()` on object fields — use `.nullable()` so keys are always
 * present and unknown values are JSON `null`.
 */

export const projectKickoffExtractionSchema = z.object({
  projectName: z
    .string()
    .describe("Short name of the project, suitable as a title."),

  department: z
    .enum(DEPARTMENT_VALUES)
    .nullable()
    .describe(
      "The department this project belongs to, chosen from the fixed list; null if it cannot be determined.",
    ),

  projectOwners: z
    .array(z.string())
    .nullable()
    .describe("Names of project owners; null if not mentioned."),

  productDirection: z
    .array(z.string())
    .nullable()
    .describe(
      "Names of people responsible for product direction; null if not mentioned.",
    ),

  engineeringLead: z
    .string()
    .nullable()
    .describe("Name of the engineering lead; null if not mentioned."),

  objectives: z
    .string()
    .nullable()
    .describe(
      "Primary goal or objective of the project in plain text; null if not stated.",
    ),

  platformEnables: z
    .array(z.string())
    .nullable()
    .describe(
      "Each capability the platform enables as a separate string; null if none listed.",
    ),

  keyDeliverables: z
    .array(z.string())
    .nullable()
    .describe(
      "Each major deliverable as a separate string; null if none listed.",
    ),

  raciMatrix: z
    .array(
      z.object({
        area: z.string().describe("Role or area, e.g. System Design."),
        responsible: z.string().nullable(),
        accountable: z.string().nullable(),
        consulted: z.string().nullable(),
        informed: z.string().nullable(),
      }),
    )
    .nullable()
    .describe("RACI matrix rows, one object per role or area; null if absent."),

  risksAndBlockers: z
    .array(z.string())
    .nullable()
    .describe(
      "Each distinct risk or blocker as a separate string; null if none listed.",
    ),

  timeline: z
    .array(
      z.object({
        milestone: z.string().describe("Milestone label."),
        targetDate: z
          .string()
          .nullable()
          .describe("Date as written in the source text; null if not stated."),
        status: z
          .string()
          .nullable()
          .describe(
            "One of: completed, in-progress, not-started; null if unclear.",
          ),
      }),
    )
    .nullable()
    .describe("High-level timeline milestones; null if none listed."),

  chosenTool: z
    .string()
    .nullable()
    .describe(
      "Chosen tool or platform for the project; null if not mentioned.",
    ),

  techStack: z
    .string()
    .nullable()
    .describe(
      "Primary tech stack summarised as a single string (e.g. Frontend: React, Backend: Node); null if not mentioned.",
    ),

  definitionOfDone: z
    .array(
      z.object({
        milestone: z.string().describe("Milestone label, e.g. Milestone 1."),
        criteria: z
          .array(z.string())
          .describe("Completion criteria bullet points."),
      }),
    )
    .nullable()
    .describe("Definition of Done broken down by milestone; null if absent."),

  additionalNotes: z
    .string()
    .describe(
      "Future work, open questions, or items marked TBD. Use an empty string if none.",
    ),
});

export type ProjectKickoffExtraction = z.infer<typeof projectKickoffExtractionSchema>;

export const editProjectKickoffSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  department: z.enum(DEPARTMENT_VALUES).nullable(),
  projectOwners: z.string().nullable(),
  engineeringLead: z.string().nullable(),
  productDirection: z.string().nullable(),
  objectives: z.string().min(1, "Objectives are required"),
  platformEnables: z.string().nullable(),
  keyDeliverables: z.string().nullable(),
  risksAndBlockers: z.string().nullable(),
  timeline: z.string().nullable(),
  chosenTool: z.string().nullable(),
  techStack: z.string().nullable(),
  definitionOfDone: z.string().nullable(),
  additionalNotes: z.string().nullable(),
});
export type EditProjectKickoffValues = z.infer<typeof editProjectKickoffSchema>;
