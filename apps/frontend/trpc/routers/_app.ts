import { createTRPCRouter } from "../init";
import { companiesRouter } from "./companies";
import { dealsRouter } from "./deals";
import { themesRouter } from "./themes";
import { leadsRouter } from "./leads";
import { screenersRouter } from "./screeners";
import { screeningsRouter } from "./screenings";
import { usersRouter } from "./users";
import { miscRouter } from "./misc";
import { jobsRouter } from "./jobs";
import { contactsRouter } from "./contacts";
import { analyticsRouter } from "./analytics";

export const appRouter = createTRPCRouter({
  companies: companiesRouter,
  deals: dealsRouter,
  themes: themesRouter,
  leads: leadsRouter,
  screeners: screenersRouter,
  screenings: screeningsRouter,
  users: usersRouter,
  misc: miscRouter,
  jobs: jobsRouter,
  contacts: contactsRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
