import { ChatOpenAI } from "@langchain/openai";

const MODEL_NAME: string =
  process.env.MODEL_NAME ?? "meta-llama/llama-3.3-70b-instruct:free";

/**
 * Returns a configured ChatOpenAI instance pointed at OpenRouter.
 * Throws clearly if the API key is missing.
 */
export function getModel(): ChatOpenAI {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "❌  OPENROUTER_API_KEY is missing. Add it to your .env file."
    );
  }

  return new ChatOpenAI({
    modelName: MODEL_NAME,
    apiKey: process.env.OPENROUTER_API_KEY,
    temperature: 0.1, // low temperature for deterministic code output
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}