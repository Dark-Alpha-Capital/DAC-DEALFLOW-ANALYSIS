import { EvalOptions } from "@/app/types";
import { auth } from "@/auth";
import { openaiClient } from "@/lib/ai/available-models";
import { NextResponse } from "next/server";

export const maxDuration = 30;

function buildSystemMessage(opts: EvalOptions) {
  return `
You are a senior investment analyst at Dark Alpha Capital.
Write in ${opts.tone ?? "narrative"} style, ${opts.detailLevel ?? "medium"} depth.
Respond in ${opts.language ?? "en-US"}.
Use a ${opts.scale ?? "0-100"} scoring scale.
Include ONLY these sections: ${(opts.sections ?? ["title", "explanation", "score"]).join(", ")}.
${opts.framework ? `Structure the explanation as a ${opts.framework.toUpperCase()} analysis.` : ""}
${opts.format === "json" ? "Output MUST follow the attached JSON Schema." : "Return well-formatted Markdown."}
`;
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    console.log("user is not logged in");
    return NextResponse.json(
      {
        type: "error",
        message: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const {
    deal,
    userPrompt,
    sections,
    tone,
    detailLevel,
    scale,
    language,
    format,
    framework,
    temperature,
  } = await req.json();

  const opts = {
    userPrompt,
    sections,
    tone,
    detailLevel,
    scale,
    language,
    format,
  };

  console.log({
    deal,
    userPrompt,
    sections,
    tone,
    detailLevel,
    scale,
    language,
    format,
    framework,
    temperature,
  });

  const sysMsg = buildSystemMessage(opts);

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
          role: "system" as const,
          content: sysMsg,
        },
        ...(opts.userPrompt
          ? [{ role: "user" as const, content: opts.userPrompt }]
          : []),
        {
          role: "user" as const,
          content: `Evaluate this deal:\n${JSON.stringify(deal)}`,
        },
      ],
    });

    console.log("response ", response);
    console.log("response ", response.output);

    // Extract just the annotations and text from the response
    const messageContent = response.output_text;
    // const messageContent = "test";
    return NextResponse.json({
      text: messageContent,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
