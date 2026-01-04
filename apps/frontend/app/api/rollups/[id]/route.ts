import { NextResponse } from "next/server";
import db, { rollups, deals, users, usersToRollups, eq } from "db";

interface UpdateDealPayload {
  id: string;
  chunk_text?: string;
  description?: string;
}

interface RollupUpdatePayload {
  name?: string;
  description?: string;
  summary?: string;
  deals?: UpdateDealPayload[];
}

// --- GET single rollup ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const [rollup] = await db.select().from(rollups).where(eq(rollups.id, id)).limit(1);

    if (!rollup) {
      return NextResponse.json({ rollup: null }, { status: 404 });
    }

    // Fetch relations
    const rollupUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(usersToRollups)
      .innerJoin(users, eq(usersToRollups.userId, users.id))
      .where(eq(usersToRollups.rollupId, id));

    const rollupDeals = await db.select().from(deals).where(eq(deals.rollupId, id));

    return NextResponse.json({ rollup: { ...rollup, users: rollupUsers, deals: rollupDeals } });
  } catch (error) {
    console.error("Error fetching rollup:", error);
    return NextResponse.json(
      { error: "Failed to fetch rollup" },
      { status: 500 },
    );
  }
}

// --- PATCH update rollup + deals ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body: RollupUpdatePayload = await request.json();
    const { name, description, summary, deals: dealsToUpdate } = body;

    // Update the rollup itself
    await db.update(rollups).set({ name, description, summary }).where(eq(rollups.id, id));

    // Update individual deals if provided
    if (Array.isArray(dealsToUpdate)) {
      for (const deal of dealsToUpdate) {
        const { id: dealId, chunk_text, description: dealDescription } = deal;
        if (!dealId) continue;

        await db.update(deals).set({ chunk_text, description: dealDescription }).where(eq(deals.id, dealId));
      }
    }

    // Return updated rollup with relations
    const [updatedRollup] = await db.select().from(rollups).where(eq(rollups.id, id)).limit(1);

    const rollupUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(usersToRollups)
      .innerJoin(users, eq(usersToRollups.userId, users.id))
      .where(eq(usersToRollups.rollupId, id));

    const rollupDeals = await db.select().from(deals).where(eq(deals.rollupId, id));

    return NextResponse.json({ rollup: { ...updatedRollup, users: rollupUsers, deals: rollupDeals } });
  } catch (error) {
    console.error("Update failed:", error);
    return NextResponse.json(
      { error: "Failed to update rollup" },
      { status: 500 },
    );
  }
}

// --- DELETE a rollup ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await db.delete(rollups).where(eq(rollups.id, id));

    return NextResponse.json({ message: "Rollup deleted" });
  } catch (error) {
    console.error("Delete failed:", error);
    return NextResponse.json(
      { error: "Failed to delete rollup" },
      { status: 500 },
    );
  }
}
