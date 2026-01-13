import { createTRPCRouter } from "../init";
import { companiesRouter } from "./companies";
import { dealsRouter } from "./deals";
import { pocsRouter } from "./pocs";
import { screenersRouter } from "./screeners";
import { screeningsRouter } from "./screenings";
import { usersRouter } from "./users";
import { miscRouter } from "./misc";
import { filesRouter } from "./files";
import { jobsRouter } from "./jobs";

export const appRouter = createTRPCRouter({
  companies: companiesRouter,
  deals: dealsRouter,
  pocs: pocsRouter,
  screeners: screenersRouter,
  screenings: screeningsRouter,
  users: usersRouter,
  misc: miscRouter,
  files: filesRouter,
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;
