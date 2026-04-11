import { db } from "..";
import { screeners, screenerQuestions } from "../schema";
import { and, asc, eq } from "drizzle-orm";

export async function insertScreenerTemplate(
  values: typeof screeners.$inferInsert,
) {
  const [created] = await db.insert(screeners).values(values).returning();
  return created ?? null;
}

export async function updateScreenerTemplateById(
  screenerId: string,
  values: {
    name: string;
    category: string;
    description: string | null;
  },
) {
  await db
    .update(screeners)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(screeners.id, screenerId));
}

export async function insertScreenerQuestion(
  values: typeof screenerQuestions.$inferInsert,
) {
  const [created] = await db
    .insert(screenerQuestions)
    .values(values)
    .returning();
  return created ?? null;
}

export async function updateScreenerQuestionById(input: {
  id: string;
  screenerId: string;
  question: string;
  weight: number;
  responseType: (typeof screenerQuestions.$inferSelect)["responseType"];
}) {
  await db
    .update(screenerQuestions)
    .set({
      question: input.question,
      weight: input.weight,
      responseType: input.responseType,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(screenerQuestions.id, input.id),
        eq(screenerQuestions.screenerId, input.screenerId),
      ),
    );
}

export async function listScreenerQuestionIdsOrdered(screenerId: string) {
  return db
    .select({ id: screenerQuestions.id })
    .from(screenerQuestions)
    .where(eq(screenerQuestions.screenerId, screenerId))
    .orderBy(asc(screenerQuestions.position), asc(screenerQuestions.createdAt));
}

export async function resequenceScreenerQuestionPositionsTx(
  screenerId: string,
  questionIdsInOrder: { id: string }[],
) {
  const OFFSET = 100000;
  const now = new Date();
  await db.transaction(async (tx) => {
    await Promise.all(
      questionIdsInOrder.map((question, index) =>
        tx
          .update(screenerQuestions)
          .set({ position: OFFSET + index, updatedAt: now })
          .where(eq(screenerQuestions.id, question.id)),
      ),
    );
    await Promise.all(
      questionIdsInOrder.map((question, index) =>
        tx
          .update(screenerQuestions)
          .set({ position: index, updatedAt: now })
          .where(eq(screenerQuestions.id, question.id)),
      ),
    );
  });
}

export async function reorderScreenerQuestionsTx(input: {
  screenerId: string;
  questionIds: string[];
}) {
  const OFFSET = 100000;
  const now = new Date();
  await db.transaction(async (tx) => {
    await Promise.all(
      input.questionIds.map((questionId, index) =>
        tx
          .update(screenerQuestions)
          .set({ position: OFFSET + index, updatedAt: now })
          .where(
            and(
              eq(screenerQuestions.id, questionId),
              eq(screenerQuestions.screenerId, input.screenerId),
            ),
          ),
      ),
    );
    await Promise.all(
      input.questionIds.map((questionId, index) =>
        tx
          .update(screenerQuestions)
          .set({ position: index, updatedAt: now })
          .where(
            and(
              eq(screenerQuestions.id, questionId),
              eq(screenerQuestions.screenerId, input.screenerId),
            ),
          ),
      ),
    );
  });
}
