import { asc, eq } from "drizzle-orm";
import { db } from "../index";
import { screeners } from "../schema";

export async function getAllProjectScreeners() {
  return db
    .select({
      id: screeners.id,
      name: screeners.name,
      category: screeners.category,
      description: screeners.description,
      department: screeners.department,
      createdAt: screeners.createdAt,
      updatedAt: screeners.updatedAt,
    })
    .from(screeners)
    .where(eq(screeners.category, "Project Screener"))
    .orderBy(asc(screeners.name));
}

export async function getScreenerById(screenerId: string) {
  const [row] = await db
    .select({
      id: screeners.id,
      name: screeners.name,
      category: screeners.category,
      description: screeners.description,
      content: screeners.content,
      department: screeners.department,
      createdAt: screeners.createdAt,
      updatedAt: screeners.updatedAt,
    })
    .from(screeners)
    .where(eq(screeners.id, screenerId))
    .limit(1);

  return row ?? null;
}
