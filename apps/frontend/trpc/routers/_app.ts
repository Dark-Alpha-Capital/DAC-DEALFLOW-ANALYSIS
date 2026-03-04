import { createTRPCRouter } from "../init";
import { dealsRouter } from "./deals";
import { pocsRouter } from "./pocs";
import { screenersRouter } from "./screeners";
import { screeningsRouter } from "./screenings";
import { usersRouter } from "./users";
import { miscRouter } from "./misc";
import { jobsRouter } from "./jobs";

export const appRouter = createTRPCRouter({
  deals: dealsRouter,
  pocs: pocsRouter,
  screeners: screenersRouter,
  screenings: screeningsRouter,
  users: usersRouter,
  misc: miscRouter,
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;
