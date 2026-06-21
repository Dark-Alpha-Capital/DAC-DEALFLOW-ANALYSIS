import { z } from "zod";

export const projectTrackersPageInputSchema = z.object({
  sortBy: z.enum(["createdAt", "department", "createdBy"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  department: z.string().optional().default(""),
});

export const screenersPageInputSchema = z.object({
  department: z.string().optional().default(""),
});
