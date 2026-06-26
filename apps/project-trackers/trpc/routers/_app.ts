import { createTRPCRouter } from "../init";
import { projectTrackersRouter } from "./project-trackers";
import { projectKickoffsRouter } from "./project-kickoffs";
import { screenersRouter } from "./screeners";
import { workItemsRouter } from "./work-items";
import { epicsRouter } from "./epics";
import { initiativesRouter } from "./initiatives";
import { cyclesRouter } from "./cycles";
import { modulesRouter } from "./modules";
import { viewsRouter } from "./views";
import { workLogsRouter } from "./work-logs";
import { workItemCommentsRouter } from "./work-item-comments";
import { analyticsRouter } from "./analytics";

export const appRouter = createTRPCRouter({
  projectTrackers: projectTrackersRouter,
  projectKickoffs: projectKickoffsRouter,
  screeners: screenersRouter,
  workItems: workItemsRouter,
  epics: epicsRouter,
  initiatives: initiativesRouter,
  cycles: cyclesRouter,
  modules: modulesRouter,
  views: viewsRouter,
  workLogs: workLogsRouter,
  workItemComments: workItemCommentsRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
