import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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
    const rollup = await prisma.rollup.findUnique({
      where: { id },
      include: {
        users: true,
        deals: true,
      },
    });

    if (!rollup) {
      return NextResponse.json({ rollup: null }, { status: 404 });
    }

    return NextResponse.json({ rollup });
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
    // Optional: check user session
    // const userSession = await auth();
    // if (!userSession) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const body: RollupUpdatePayload = await request.json();
    const { name, description, summary, deals } = body;

    // Update the rollup itself
    await prisma.rollup.update({
      where: { id },
      data: { name, description, summary },
    });

    // Update individual deals if provided
    if (Array.isArray(deals)) {
      for (const deal of deals) {
        const { id: dealId, chunk_text, description: dealDescription } = deal;
        if (!dealId) continue;

        await prisma.deal.update({
          where: { id: dealId },
          data: { chunk_text, description: dealDescription },
        });
      }
    }

    // Return updated rollup with relations
    const rollupWithRelations = await prisma.rollup.findUnique({
      where: { id },
      include: {
        users: true,
        deals: true,
      },
    });

    return NextResponse.json({ rollup: rollupWithRelations });
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
    // Optional: check user session
    // const userSession = await auth();
    // if (!userSession) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    await prisma.rollup.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Rollup deleted" });
  } catch (error) {
    console.error("Delete failed:", error);
    return NextResponse.json(
      { error: "Failed to delete rollup" },
      { status: 500 },
    );
  }
}
