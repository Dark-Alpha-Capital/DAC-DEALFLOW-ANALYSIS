import { getGoogleGenAI, getOpenAIClient } from "@repo/ai-core";

export const EMBEDDING_MODEL = "gemini-embedding-2-preview";
export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 768;

export interface MultimodalPart {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

function toGeminiParts(
  input: string | MultimodalPart[],
): { text?: string; inlineData?: { data: string; mimeType: string } }[] {
  if (typeof input === "string") {
    return [{ text: input }];
  }
  return input;
}

async function getGeminiEmbedding(
  input: string | MultimodalPart[],
): Promise<number[]> {
  const response = await getGoogleGenAI().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [{ parts: toGeminiParts(input) }],
    config: { outputDimensionality: EMBEDDING_DIMENSION },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("Gemini returned no embeddings");
  }
  return values;
}

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

export async function getEmbedding(input: string | MultimodalPart[]): Promise<number[] | null> {
  if (typeof input !== "string") {
    throw new Error(
      "OpenAI-only embedding mode does not support multimodal input",
    );
  }
  return getOpenAIEmbedding(input);
}

export async function getBatchEmbeddings(inputs: (string | MultimodalPart[])[]) {
  return Promise.all(inputs.map((input) => getEmbedding(input)));
}

export function cosineSimilarity(
  vecA: number[] | null | undefined,
  vecB: number[] | null | undefined
) {
  if (!vecA || !vecB) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += (vecA[i] || 0) * (vecB[i] || 0);
    normA += (vecA[i] || 0) * (vecA[i] || 0);
    normB += (vecB[i] || 0) * (vecB[i] || 0);
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function isValidEmbeddingDimension(
  embedding: number[] | null | undefined,
  expectedDimension: number = EMBEDDING_DIMENSION
): embedding is number[] {
  return Array.isArray(embedding) && embedding.length === expectedDimension;
}
