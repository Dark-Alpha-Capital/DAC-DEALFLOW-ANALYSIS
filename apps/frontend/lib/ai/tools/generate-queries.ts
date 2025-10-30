import { z } from "zod";

import { generateObject } from "ai";
import { openai } from "../available-models";

const generateSearchQueries = async (query: string, n: number = 3) => {
  const {
    object: { queries },
  } = await generateObject({
    model: openai("gpt-4o"),
    prompt: `Generate ${n} search queries for the following query: ${query}`,
    schema: z.object({
      queries: z.array(z.string()).min(1).max(5),
    }),
  });
  return queries;
};

export { generateSearchQueries };
