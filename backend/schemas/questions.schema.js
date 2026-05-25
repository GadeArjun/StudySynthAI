import { z } from "zod";
import { llm } from "../config/llm.js";

const schema = z.object({
  que: z.string().describe("Extracted question"),
  searchFor: z.enum(["data", "image", "both", null]).describe("What to search for"),
  query: z.string().describe("Optimized web search query"),
});

const questionsSchema = z.array(schema);

export const questionsLLM = llm.withStructuredOutput(questionsSchema);
