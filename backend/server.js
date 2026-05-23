import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
import { z } from "zod";
import { searchOnWeb } from "./services/webSearch.service.js";

config();

/**
 * TOOL DEFINITION
 */
const webSearch = {
  name: "web_search",
  description: "Search the web for real-time information",
  schema: z.object({
    query: z.string().describe("Search query"),
  }),
};

/**
 * SYSTEM PROMPT (OPTIMIZED)
 */
const systemPrompt = new SystemMessage(`You are NxtAI with web search capability.

RULES (STRICT):

1. Web-needed queries (real-time / latest / factual):
   - MUST FIRST output:
     "searching: <short reason/query>"
   - MUST NOT skip this step
   - Then call web_search tool immediately
   - Do NOT add date in search query for web_search

2. After search results:
   - Answer using available results
   - If results are incomplete, clearly fill gaps with general knowledge (clearly separate from web info)
   - Be concise, structured, and clear
   - Include sources/links if available
   - Include images if provided

ABSOLUTE PRIORITY:
- Follow order strictly: message → tool → answer
- No speculation as fact`);

/**
 * MODEL
 */
const llm = new ChatOpenAI({
  model: "openai/gpt-oss-120b:free", // nvidia/nemotron-3-super-120b-a12b:free openai/gpt-oss-120b:free
  temperature: 0.7,
  maxTokens: 2000,
  streaming: true,
  maxRetries: 5,

  reasoning: {
    effort: "minimal",
  },

  apiKey: process.env.AI_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});

const llmWithTools = llm.bindTools([webSearch]);

/**
 * USER INPUT
 */
const messages = [
  systemPrompt,
  new HumanMessage(
    "Exapln ozon layer with images digrams based on topic"
  ),
];

/**
 * STEP 1: FIRST MODEL CALL (DECIDE TOOL)
 */
const stream = await llmWithTools.stream(messages);

let full = null;

for await (const chunk of stream) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }

  full = full ? concat(full, chunk) : chunk;
//   console.log(full)
}

/**
 * SAFETY CHECK (IMPORTANT FIX)
 */
const toolCalls = full?.tool_calls || [];

if (toolCalls.length > 0) {
  const query = toolCalls[0].args.query;

  console.log("\n\n🔎 Searching Web For:", query);

  /**
   * STEP 2: CALL YOUR REAL SEARCH FUNCTION
   */
  const searchResults = await searchOnWeb(query);
  console.log({searchResults:JSON.stringify(searchResults, null, 2)});

  /**
   * STEP 3: SEND RESULTS BACK TO MODEL
   */
  const finalMessages = [
    ...messages,
    new HumanMessage(
      "## WEB RESULT :\n" + JSON.stringify(searchResults, null, 2)
    ),
  ];

  const finalStream = await llmWithTools.stream(finalMessages);

  let finalFull = null;

  for await (const chunk of finalStream) {
    if (chunk.content) {
      process.stdout.write(chunk.content);
    }

    finalFull = finalFull ? concat(finalFull, chunk) : chunk;
  }

  console.log("\n\n✅ Done");
}