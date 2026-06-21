import { and, asc, eq } from "drizzle-orm";
import { db } from "../index";
import { screeners, type DepartmentValue } from "../schema";

export async function getAllProjectScreeners(department?: DepartmentValue) {
  const conditions: ReturnType<typeof eq>[] = [
    eq(screeners.category, "Project Screener"),
  ];
  if (department) {
    conditions.push(eq(screeners.department, department));
  }
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
    .where(and(...conditions))
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
