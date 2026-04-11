import { createTRPCRouter, protectedProcedure } from "../init";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import {
  listContactsByEntity,
  getContactById,
  insertContact,
  updateContactById,
  deleteContactById,
} from "@repo/db/mutations";
import {
  baseContactSchema,
  contactByIdInputSchema,
  listContactsByEntityInputSchema,
  updateContactSchema,
} from "@/lib/zod-schemas/contacts-router";

export const contactsRouter = createTRPCRouter({
  listByEntity: protectedProcedure
    .input(listContactsByEntityInputSchema)
    .query(async ({ input }) => {
      return listContactsByEntity({
        entityType: input.entityType,
        entityId: input.entityId,
      });
    }),

  create: protectedProcedure
    .input(baseContactSchema)
    .mutation(async ({ input }) => {
      const added = await insertContact({
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
      });

      scheduleRevalidateForEntity(input.entityType, input.entityId);
      return { contactId: added?.id };
    }),

  update: protectedProcedure
    .input(updateContactSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      await updateContactById(id, {
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
      });

      scheduleRevalidateForEntity(data.entityType, data.entityId);
      return { contactId: id };
    }),

  delete: protectedProcedure
    .input(contactByIdInputSchema)
    .mutation(async ({ input }) => {
      const existing = await getContactById(input.id);

      await deleteContactById(input.id);

      if (existing) {
        scheduleRevalidateForEntity(existing.entityType, existing.entityId);
      }

      return { success: true };
    }),
});

function scheduleRevalidateForEntity(entityType: string, entityId: string) {
  after(async () => {
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
  });
}
