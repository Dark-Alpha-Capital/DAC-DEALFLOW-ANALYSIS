export const PROJECT_KICKOFF_SCREENING_SYSTEM = `You are an internal project evaluator for Dark Alpha Capital, a lower-middle-market private equity firm. Your job is to evaluate whether a proposed internal project is worth the firm's time and resources.

You will receive:
1. A structured project description (name, department, objectives, deliverables, timeline, risks, etc.)
2. Optionally, the department-specific screening criteria that describes what matters most to that department.

Your output has two parts:

SCORE
You must assign a score from EXACTLY this list and no other value:
0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5

Do not output 3.2, 4.8, or any number not in the list above. Pick the single closest value from the list that reflects your honest assessment. A score of 5 means the project is clearly valuable, well-scoped, and aligned with firm priorities. A score of 0 means the project has no clear value or is entirely misaligned. Use the full range — do not cluster scores around the middle.

ANALYSIS
Write exactly 2–4 sentences (50–60 words total). Be direct and specific. State the most important reason for the score — what drives value or what the main problem is. Do not use buzzwords (leverage, synergize, holistic, robust, seamless, best-in-class, cutting-edge). Write as if a managing director is reading it with 20 seconds to spare.

What earns a high score:
- Clear, measurable business value (saves hours, reduces errors, enables a decision faster)
- Well-defined scope — deliverables are specific, not vague
- Department genuinely needs this; it is not a duplicate of existing tooling
- Realistic timeline and named owners
- Directly supports deal flow, investor relations, compliance, or operations

What earns a low score:
- Vague objectives with no measurable outcome
- Duplicates a tool or process that already exists
- No clear owner or accountable party
- Low-priority work that can wait indefinitely with no cost
- Poorly scoped with no definition of done`;

export interface ProjectKickoffScreeningInput {
  projectName: string;
  department: string | null;
  objectives: string;
  projectOwners: string | null;
  engineeringLead: string | null;
  productDirection: string | null;
  platformEnables: string | null;
  keyDeliverables: string | null;
  risksAndBlockers: string | null;
  timeline: string | null;
  chosenTool: string | null;
  techStack: string | null;
  definitionOfDone: string | null;
  additionalNotes: string | null;
}

export interface DepartmentScreenerInput {
  name: string;
  description: string | null;
}

export function buildProjectKickoffScreeningPrompt(
  project: ProjectKickoffScreeningInput,
  screener: DepartmentScreenerInput | null,
): string {
  const lines: string[] = [];

  lines.push("=== PROJECT DETAILS ===");
  lines.push(`Project name: ${project.projectName}`);

  if (project.department) {
    lines.push(`Department: ${project.department}`);
  }

  lines.push(`\nObjectives:\n${project.objectives}`);

  if (project.projectOwners?.trim()) {
    lines.push(`\nProject owners: ${project.projectOwners}`);
  }
  if (project.engineeringLead?.trim()) {
    lines.push(`Engineering lead: ${project.engineeringLead}`);
  }
  if (project.productDirection?.trim()) {
    lines.push(`Product direction: ${project.productDirection}`);
  }
  if (project.keyDeliverables?.trim()) {
    lines.push(`\nKey deliverables:\n${project.keyDeliverables}`);
  }
  if (project.platformEnables?.trim()) {
    lines.push(`\nPlatform enables:\n${project.platformEnables}`);
  }
  if (project.risksAndBlockers?.trim()) {
    lines.push(`\nRisks and blockers:\n${project.risksAndBlockers}`);
  }
  if (project.timeline?.trim()) {
    lines.push(`\nTimeline:\n${project.timeline}`);
  }
  if (project.definitionOfDone?.trim()) {
    lines.push(`\nDefinition of done:\n${project.definitionOfDone}`);
  }
  if (project.chosenTool?.trim()) {
    lines.push(`\nChosen tool / board: ${project.chosenTool}`);
  }
  if (project.techStack?.trim()) {
    lines.push(`Tech stack: ${project.techStack}`);
  }
  if (project.additionalNotes?.trim()) {
    lines.push(`\nAdditional notes:\n${project.additionalNotes}`);
  }

  if (screener) {
    lines.push(`\n=== DEPARTMENT SCREENING CRITERIA (${screener.name}) ===`);
    if (screener.description?.trim()) {
      lines.push(screener.description);
    } else {
      lines.push("No specific criteria provided for this department.");
    }
  } else {
    lines.push(
      `\n=== DEPARTMENT SCREENING CRITERIA ===\nNo screener template found for this department. Evaluate based on the project details and general firm priorities.`,
    );
  }

  lines.push(
    "\n=== INSTRUCTIONS ===\nScore this project and write your analysis following the rules in the system prompt.",
  );

  return lines.join("\n");
}
