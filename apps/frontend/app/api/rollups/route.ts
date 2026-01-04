import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import db, { rollups, deals, users, usersToRollups, eq, desc } from "db";

interface SaveRollupRequestBody {
  name: string;
  description?: string;
  dealIds: string[];
}

// Create a new rollup
export async function POST(request: Request) {
  const userSession = await getSession();

  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: SaveRollupRequestBody = await request.json();
    const { name, description, dealIds } = body;

    if (!name || !dealIds?.length) {
      return NextResponse.json(
        { error: "Rollup name and at least one deal are required" },
        { status: 400 },
      );
    }

    // Create the rollup
    const [rollup] = await db.insert(rollups).values({
      name,
      description,
    }).returning();

    // Connect user to rollup (A = rollupId, B = userId in the join table)
    await db.insert(usersToRollups).values({
      A: rollup.id,
      B: userSession.user.id,
    });

    // Connect deals to rollup
    for (const dealId of dealIds) {
      await db.update(deals).set({ rollupId: rollup.id }).where(eq(deals.id, dealId));
    }

    // Fetch rollup with relations (A = rollupId, B = userId in the join table)
    const rollupUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(usersToRollups)
      .innerJoin(users, eq(usersToRollups.B, users.id))
      .where(eq(usersToRollups.A, rollup.id));

    const rollupDeals = await db.select().from(deals).where(eq(deals.rollupId, rollup.id));

    return NextResponse.json({ rollup: { ...rollup, users: rollupUsers, deals: rollupDeals } });
  } catch (error) {
    console.error("Error saving rollup:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// GET all rollups
export async function GET() {
  try {
    const rollupsList = await db.select().from(rollups).orderBy(desc(rollups.createdAt));

    // Fetch relations for each rollup
    const rollupsWithRelations = await Promise.all(
      rollupsList.map(async (rollup) => {
        const rollupUsers = await db
          .select({ id: users.id, name: users.name, email: users.email, role: users.role })
          .from(usersToRollups)
          .innerJoin(users, eq(usersToRollups.B, users.id))
          .where(eq(usersToRollups.A, rollup.id));

        const rollupDeals = await db.select().from(deals).where(eq(deals.rollupId, rollup.id));

        return { ...rollup, users: rollupUsers, deals: rollupDeals };
      }),
    );

    return NextResponse.json({ rollups: rollupsWithRelations });
  } catch (error) {
    console.error("Error fetching rollups:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
