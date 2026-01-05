import { createTRPCRouter } from "../init";
import { companiesRouter } from "./companies";
import { dealsRouter } from "./deals";
import { pocsRouter } from "./pocs";
import { screenersRouter } from "./screeners";
import { screeningsRouter } from "./screenings";
import { usersRouter } from "./users";
import { miscRouter } from "./misc";

export const appRouter = createTRPCRouter({
  companies: companiesRouter,
  deals: dealsRouter,
  pocs: pocsRouter,
  screeners: screenersRouter,
  screenings: screeningsRouter,
  users: usersRouter,
  misc: miscRouter,
});

export type AppRouter = typeof appRouter;
