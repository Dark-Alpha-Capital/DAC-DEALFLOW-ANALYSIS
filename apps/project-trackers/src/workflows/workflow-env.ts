export type ProjectKickoffScreenParams = {
  jobId: string;
  kickoffId: string;
  screeningId: string;
  userId: string | null;
};

export interface WorkflowWorkerEnv {
  DB: D1Database;
  PROJECT_KICKOFF_SCREEN_WORKFLOW: Workflow<ProjectKickoffScreenParams>;
  OPENAI_API_KEY?: string;
  AI_API_KEY?: string;
}
