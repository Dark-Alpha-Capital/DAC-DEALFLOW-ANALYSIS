import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { ViewTypeValue } from "@repo/enums";
import { db } from "..";
import {
  views,
  type ViewTypeValue as SchemaViewTypeValue,
} from "../schema";
import { getViewById } from "../queries/views";

export type CreateViewInput = {
  trackerId: string;
  name: string;
  type: ViewTypeValue;
  filters?: Record<string, unknown>;
  sortConfig?: Record<string, unknown>;
  groupBy?: string | null;
  displayProps?: Record<string, unknown>;
  isDefault?: boolean;
  createdBy: string;
};

export async function createView(input: CreateViewInput) {
  const id = createId();
  const now = new Date();

  if (input.isDefault) {
    await db
      .update(views)
      .set({ isDefault: false, updatedAt: now })
      .where(eq(views.trackerId, input.trackerId));
  }

  await db.insert(views).values({
    id,
    trackerId: input.trackerId,
    name: input.name.trim(),
    type: input.type as SchemaViewTypeValue,
    filters: JSON.stringify(input.filters ?? {}),
    sortConfig: JSON.stringify(input.sortConfig ?? {}),
    groupBy: input.groupBy ?? null,
    displayProps: JSON.stringify(input.displayProps ?? {}),
    isDefault: input.isDefault ?? false,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  return getViewById(id);
}

export type UpdateViewInput = {
  viewId: string;
  name?: string;
  type?: ViewTypeValue;
  filters?: Record<string, unknown>;
  sortConfig?: Record<string, unknown>;
  groupBy?: string | null;
  displayProps?: Record<string, unknown>;
  isDefault?: boolean;
};

export async function updateView(input: UpdateViewInput) {
  const existing = await getViewById(input.viewId);
  if (!existing) return null;

  const patch: Partial<typeof views.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.type !== undefined) patch.type = input.type as SchemaViewTypeValue;
  if (input.filters !== undefined) patch.filters = JSON.stringify(input.filters);
  if (input.sortConfig !== undefined) patch.sortConfig = JSON.stringify(input.sortConfig);
  if (input.groupBy !== undefined) patch.groupBy = input.groupBy;
  if (input.displayProps !== undefined) patch.displayProps = JSON.stringify(input.displayProps);
  if (input.isDefault !== undefined) patch.isDefault = input.isDefault;

  if (input.isDefault) {
    await db
      .update(views)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(views.trackerId, existing.trackerId));
  }

  await db.update(views).set(patch).where(eq(views.id, input.viewId));
  return getViewById(input.viewId);
}

export async function deleteView(viewId: string) {
  const existing = await getViewById(viewId);
  if (!existing) return false;
  await db.delete(views).where(eq(views.id, viewId));
  return true;
}
