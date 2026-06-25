import { createTRPCRouter } from "../init";
import { projectTrackersRouter } from "./project-trackers";
import { projectKickoffsRouter } from "./project-kickoffs";
import { screenersRouter } from "./screeners";
import { workItemsRouter } from "./work-items";

export const appRouter = createTRPCRouter({
  projectTrackers: projectTrackersRouter,
  projectKickoffs: projectKickoffsRouter,
  screeners: screenersRouter,
  workItems: workItemsRouter,
});

export type AppRouter = typeof appRouter;
