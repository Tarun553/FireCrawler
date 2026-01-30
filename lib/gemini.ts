import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Model for text embeddings
export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

// Model for chat completions
export const chatModel = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
});

export default genAI;
