import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY! });



export const EMBEDDING_MODEL = "gemini-embedding-2-preview";
export const EMBEDDING_DIMENSION = 768;

export interface MultimodalPart {
    text?: string;
    inlineData?: {
        data: string;
        mimeType: string;
    };
}


export async function getEmbedding(input: string | MultimodalPart[]): Promise<number[] | null> {
    const multimodalModel = EMBEDDING_MODEL;

    let parts: any[] = [];
    if (typeof input === 'string') {
        parts = [{ text: input }];
    } else {
        parts = input;
    }

    try {
        const response = await ai.models.embedContent({
            model: multimodalModel,
            contents: [{ parts }],
            config: { outputDimensionality: EMBEDDING_DIMENSION },
        });

        const values = response.embeddings?.[0]?.values;
        if (!values) {
            throw new Error("No embeddings returned from API");
        }
        return values;
    } catch (error) {
        console.error("Embedding error:", error);
        throw error;
    }
}

export async function getBatchEmbeddings(inputs: (string | MultimodalPart[])[]) {
    const multimodalModel = EMBEDDING_MODEL;

    try {
        const response = await ai.models.embedContent({
            model: multimodalModel,
            contents: inputs.map(input => {
                const parts = typeof input === 'string' ? [{ text: input }] : input;
                return { parts };
            }),
            config: { outputDimensionality: EMBEDDING_DIMENSION },
        });

        if (!response.embeddings) {
            throw new Error("No embeddings returned from API");
        }
        return response.embeddings.map(e => e.values || null);
    } catch (error) {
        console.error("Batch embedding error:", error);
        throw error;
    }
}

export function cosineSimilarity(vecA: number[] | null | undefined, vecB: number[] | null | undefined) {
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
    expectedDimension: number = EMBEDDING_DIMENSION,
): embedding is number[] {
    return Array.isArray(embedding) && embedding.length === expectedDimension;
}

