import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { contacts, eq, and } from "@repo/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { httpHttpsUrlSchema } from "@/lib/schemas";

const entityTypeEnum = z.enum(["LEAD", "COMPANY", "DEAL_OPPORTUNITY"]);

const baseContactSchema = z.object({
  entityType: entityTypeEnum,
  entityId: z.string(),
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  linkedinUrl: httpHttpsUrlSchema.optional(),
  role: z.string().optional(),
});

export const contactsRouter = createTRPCRouter({
  listByEntity: protectedProcedure
    .input(
      z.object({
        entityType: entityTypeEnum,
        entityId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.entityType, input.entityType),
            eq(contacts.entityId, input.entityId),
          ),
        );
    }),

  create: protectedProcedure
    .input(baseContactSchema)
    .mutation(async ({ input }) => {
      const [added] = await db
        .insert(contacts)
        .values({
          entityType: input.entityType,
          entityId: input.entityId,
          companyId:
            input.entityType === "COMPANY" ? input.entityId : undefined,
          leadId:
            input.entityType === "LEAD" ? input.entityId : undefined,
          dealOpportunityId:
            input.entityType === "DEAL_OPPORTUNITY"
              ? input.entityId
              : undefined,
          name: input.name,
          title: input.title || null,
          email: input.email || null,
          phone: input.phone || null,
          linkedinUrl: input.linkedinUrl || null,
          role: input.role || null,
        })
        .returning();

      revalidateForEntity(input.entityType, input.entityId);
      return { contactId: added?.id };
    }),

  update: protectedProcedure
    .input(
      baseContactSchema.extend({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      await db
        .update(contacts)
        .set({
          entityType: data.entityType,
          entityId: data.entityId,
          companyId:
            data.entityType === "COMPANY" ? data.entityId : null,
          leadId:
            data.entityType === "LEAD" ? data.entityId : null,
          dealOpportunityId:
            data.entityType === "DEAL_OPPORTUNITY" ? data.entityId : null,
          name: data.name,
          title: data.title || null,
          email: data.email || null,
          phone: data.phone || null,
          linkedinUrl: data.linkedinUrl || null,
          role: data.role || null,
        })
        .where(eq(contacts.id, id));

      revalidateForEntity(data.entityType, data.entityId);
      return { contactId: id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, input.id));

      await db.delete(contacts).where(eq(contacts.id, input.id));

      if (existing) {
        revalidateForEntity(existing.entityType, existing.entityId);
      }

      return { success: true };
    }),
});

function revalidateForEntity(entityType: string, entityId: string) {
  switch (entityType) {
    case "COMPANY": {
      revalidatePath("/companies");
      revalidatePath(`/companies/${entityId}`);
      revalidateTag("companies", "max");
      revalidateTag(`company-${entityId}`, "max");
      break;
    }
    case "LEAD": {
      revalidatePath("/leads");
      revalidatePath(`/leads/${entityId}`);
      revalidateTag("leads", "max");
      revalidateTag(`lead-${entityId}`, "max");
      break;
    }
    case "DEAL_OPPORTUNITY": {
      revalidateTag("deals", "max");
      revalidateTag(`deal-${entityId}`, "max");
      break;
    }
    default:
      break;
  }
}
