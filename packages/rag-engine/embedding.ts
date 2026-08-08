import { getOpenAIClient } from "@repo/ai-core";

export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 768;

async function getOpenAIEmbedding(input: string): Promise<number[]> {
  const response = await getOpenAIClient().embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input,
    dimensions: EMBEDDING_DIMENSION,
  });
  const values = response.data?.[0]?.embedding;
  if (!values?.length) {
    throw new Error("OpenAI returned no embeddings");
  }
  return values;
}

/** Embed a text string. OpenAI text-embedding does not support multimodal input. */
export async function getEmbedding(input: string): Promise<number[]> {
  return getOpenAIEmbedding(input);
}
