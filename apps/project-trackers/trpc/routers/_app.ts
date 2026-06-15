import { createTRPCRouter } from "../init";
import { projectTrackersRouter } from "./project-trackers";
import { projectKickoffsRouter } from "./project-kickoffs";
import { screenersRouter } from "./screeners";

export const appRouter = createTRPCRouter({
  projectTrackers: projectTrackersRouter,
  projectKickoffs: projectKickoffsRouter,
  screeners: screenersRouter,
});

export type AppRouter = typeof appRouter;
