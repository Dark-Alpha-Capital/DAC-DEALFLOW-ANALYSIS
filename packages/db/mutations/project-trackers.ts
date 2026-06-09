import { deleteProjectKickoff } from "./project-kickoffs";

/** Deletes kickoff; tracker and screenings cascade via FK */
export async function deleteProjectTracker(kickoffId: string) {
  await deleteProjectKickoff(kickoffId);
}
