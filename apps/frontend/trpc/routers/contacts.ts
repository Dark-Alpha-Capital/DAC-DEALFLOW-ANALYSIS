import { createTRPCRouter, protectedProcedure } from "../init";
import {
  listContactsByEntity,
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

      return { contactId: id };
    }),

  delete: protectedProcedure
    .input(contactByIdInputSchema)
    .mutation(async ({ input }) => {
      await deleteContactById(input.id);

      return { success: true };
    }),
});

