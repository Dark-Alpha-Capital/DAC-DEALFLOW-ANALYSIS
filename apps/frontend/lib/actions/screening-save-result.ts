"use server";

import { getSession } from "@/lib/auth-server";
import { openai } from "@/lib/ai/available-models";
import db, { Sentiment, aiScreenings } from "db";
import { generateObject } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ScreeningResultSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
  score: z.number(),
});

export const screeningSaveResult = async (
  resultMarkdown: string,
  dealId: string,
) => {
  const session = await getSession();

  if (!session?.user) {
    return {
      type: "error",
      message: "Unauthorized",
    };
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: ScreeningResultSchema,
      prompt: `Please generate a summary of the following screening result: ${resultMarkdown}`,
    });

    console.log(object);

    const { title, explanation, sentiment, score } = object;

    await db.insert(aiScreenings).values({
      title,
      explanation,
      sentiment,
      score,
      dealId,
      content: resultMarkdown,
    });

    revalidatePath(`/raw-deals/${dealId}`);
    revalidatePath(`/raw-deals/${dealId}/screen`);

    return {
      type: "success",
      data: object,
    };
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return {
        type: "error",
        message: error.message,
      };
    }
    return {
      type: "error",
      message: "An unknown error occurred",
    };
  }
};
