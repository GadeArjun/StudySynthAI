import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";

config();
/**
 * MODEL
 */
let llmConfig = {
  model: "openai/gpt-oss-120b:free", // nvidia/nemotron-3-super-120b-a12b:free openai/gpt-oss-120b:free
  temperature: 0.7,
  maxTokens: 2000,
  streaming: true,
  maxRetries: 5,

  reasoning: {
    effort: "minimal",
  },
};



/**
 * Update LLM configuration
 *
 * @param {{
*   model?: string,
*   temperature?: number,
*   maxTokens?: number,
*   streaming?: boolean,
*   maxRetries?: number,
*   reasoning?: {
*     effort?: string
*   }
* }} newConfig
*/

export const changeLlmConfig = (newConfig) => {
  // console.log(newConfig)
  llmConfig = { ...llmConfig, ...newConfig };
};

export const llm = new ChatOpenAI({
  model: llmConfig.model, // nvidia/nemotron-3-super-120b-a12b:free openai/gpt-oss-120b:free
  temperature: llmConfig.temperature,
  maxTokens: llmConfig.maxTokens,
  streaming: llmConfig.streaming,
  maxRetries: llmConfig.maxRetries,

  reasoning: llmConfig.reasoning,

  apiKey: process.env.AI_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});
