import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export const googleGenAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export const openai = createOpenAI({
  apiKey: process.env.AI_API_KEY,
});

export const openaiClient = new OpenAI({
  apiKey: process.env.AI_API_KEY,
});
