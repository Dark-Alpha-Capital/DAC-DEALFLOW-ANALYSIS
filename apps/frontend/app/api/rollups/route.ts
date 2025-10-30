import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

interface SaveRollupRequestBody {
  name: string;
  description?: string;
  dealIds: string[];
}

// Create a new rollup
export async function POST(request: Request) {
  const userSession = await auth();

  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: SaveRollupRequestBody = await request.json();
    const { name, description, dealIds } = body;

    if (!name || !dealIds?.length) {
      return NextResponse.json(
        { error: "Rollup name and at least one deal are required" },
        { status: 400 }
      );
    }

    const rollup = await prisma.rollup.create({
      data: {
        name,
        description,
        users: { connect: { id: userSession.user.id } },
        deals: { connect: dealIds.map((id) => ({ id })) },
      },
      include: {
        users: true,
        deals: true,
      },
    });

    return NextResponse.json({ rollup });
  } catch (error) {
    console.error("Error saving rollup:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET all rollups
export async function GET() {
  try {
    const rollups = await prisma.rollup.findMany({
      include: { users: true, deals: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rollups });
  } catch (error) {
    console.error("Error fetching rollups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
