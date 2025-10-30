"use server";

import { openaiClient } from "@/lib/ai/available-models";
import { withAuthServerAction } from "@/lib/withAuth";
import { Deal, Sentiment } from "@prisma/client";
import { User } from "@prisma/client";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { auth } from "@/auth";
const DealScreeningResult = z.object({
  title: z.string(),
  explanation: z.string(),
  sentiment: z.nativeEnum(Sentiment),
  score: z.number(),
});

const screenDeal = async (deal: Deal) => {
  const session = await auth();

  if (!session?.user) {
    console.log("user is not logged in");
    return {
      type: "error",
      message: "Unauthorized",
    };
  }

  try {
    const response = await openaiClient.responses.create({
      model: "gpt-4.1",
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_J6ChDdA5z2j0fJKtmoOQnohz"],
          max_num_results: 20,
        },
      ],
      input: [
        {
          role: "system",
          content:
            "You are a senior investment analyst at Dark Alpha Capital, specializing in evaluating deals based on our firm's proprietary screening criteria. Utilize the provided vector store to retrieve relevant guidelines and apply them meticulously to assess the given deal. Your evaluation should include:\n\n- A clear title summarizing the deal.\n- An explanation detailing how the deal aligns or misaligns with our screening criteria.\n- An overall sentiment classification: Positive, Neutral, or Negative.\n- A numerical score between 0 and 100, reflecting the deal's alignment with our criteria.\n\nIf specific information is unavailable, explicitly state this in your explanation. Ensure your response is structured to match the predefined schema for seamless integration.",
        },
        {
          role: "user",
          content: `Please evaluate the following deal: ${JSON.stringify(deal)}`,
        },
      ],
    });

    console.log("Response output:", response);

    return {
      type: "success",
      result: response.output_text,
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

export default screenDeal;
