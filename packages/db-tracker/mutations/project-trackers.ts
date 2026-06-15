import { deleteProjectKickoff } from "./project-kickoffs";

export async function deleteProjectTracker(kickoffId: string) {
  await deleteProjectKickoff(kickoffId);
}
