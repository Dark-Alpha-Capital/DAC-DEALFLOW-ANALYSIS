import { GoogleGenAI } from "@google/genai";
import { requireGoogleGeminiApiKey } from "../env";

let _instance: GoogleGenAI | null = null;

export function getGoogleGenAI(): GoogleGenAI {
  if (!_instance) {
    _instance = new GoogleGenAI({ apiKey: requireGoogleGeminiApiKey() });
  }
  return _instance;
}
