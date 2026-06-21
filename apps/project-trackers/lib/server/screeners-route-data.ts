import { createServerFn } from "@tanstack/react-start";
import { getAllProjectScreeners } from "@repo/db-tracker/queries";
import { DEPARTMENT_VALUES } from "@repo/enums";
import type { DepartmentValue } from "@repo/db-tracker/schema";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { screenersPageInputSchema } from "@/lib/server/server-fn-input-schemas";

export const loadScreenersPageData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => screenersPageInputSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const department =
      data.department &&
      (DEPARTMENT_VALUES as readonly string[]).includes(data.department)
        ? (data.department as DepartmentValue)
        : undefined;

    const screeners = await getAllProjectScreeners(department);
    return { screeners };
  });
