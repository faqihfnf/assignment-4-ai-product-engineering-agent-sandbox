import { OpenAIClient } from "@anvia/openai";
import "dotenv/config";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey || apiKey === "your-api-key") {
  throw new Error("Set OPENAI_API_KEY in .env or your environment.");
}

// Accept both names: the Devscale gateway docs use OPENAI_API_BASE_URL.
const baseUrl = process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE_URL;

const client = new OpenAIClient({ apiKey, baseUrl });

// gpt-5.6-luna supports function calling on the Devscale gateway and is cheap.
export const MODEL_ID = process.env.OPENAI_MODEL || "gpt-5.6-luna";

export function getModel() {
  return client.completionModel({ modelId: MODEL_ID });
}
