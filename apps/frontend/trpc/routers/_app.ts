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
import { filesRouter } from "./files";
import { companyNotesRouter } from "./companyNotes";
import { outreachRouter } from "./outreach";
import { chatsRouter } from "./chats";

export const appRouter = createTRPCRouter({
  companies: companiesRouter,
  dealOpportunities: dealsRouter,
  deals: dealsRouter, // backward-compatible alias
  themes: themesRouter,
  leads: leadsRouter,
  screeners: screenersRouter,
  screenings: screeningsRouter,
  users: usersRouter,
  misc: miscRouter,
  jobs: jobsRouter,
  contacts: contactsRouter,
  analytics: analyticsRouter,
  files: filesRouter,
  companyNotes: companyNotesRouter,
  outreach: outreachRouter,
  chats: chatsRouter,
});

export type AppRouter = typeof appRouter;
