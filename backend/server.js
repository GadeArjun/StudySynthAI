// import {
//   HumanMessage,
//   SystemMessage,
//   ToolMessage,
// } from "@langchain/core/messages";
// import { concat } from "@langchain/core/utils/stream";
// import { config } from "dotenv";
// import { z } from "zod";
// import { searchOnWeb } from "./services/webSearch.service.js";
// import { llm } from "./config/llm.js";

import { app } from "./pipelines/llm.pipeline.js";

// config();

// /**
//  * TOOL DEFINITION
//  */
// const webSearch = {
//   name: "web_search",
//   description: "Search the web for real-time information",
//   schema: z.object({
//     query: z.string().describe("Search query"),
//   }),
// };


// const systemPrompt_1 = `
// You are an AI agent that extracts questions from the user's request.

// Your task:
// - Identify all meaningful questions or searchable topics from the user input.
// - Generate a clear web search query for each extracted question.

// Rules (Strictly Follow):
// - Return ONLY valid JSON.
// - Do NOT return markdown.
// - Do NOT add explanations or extra text.
// - Output must always be an array.
// - If no meaningful question exists, return an empty array [].

// Output format:

// [
//   {
//     "que": "Extracted question",
//     "query": "Optimized web search query"
//   }
// ]

// Field meanings:
// - que  → the extracted user question/topic
// - query → a clean and optimized query for web search
// `;

// const userInput = "Exaplin nature with images and formating properly anwer";
// const messages_1 = [
//   new SystemMessage(systemPrompt_1),
//   new HumanMessage(userInput),
// ];

// const llmWithTool = llm.bindTools([webSearch]);

// const stream_1 = await llmWithTool.stream(messages_1);

// let firstRes = "";
// for await (const chunk of stream_1) {
//   process.stdout.write(chunk.content);
//   firstRes = !firstRes ? chunk : concat(firstRes, chunk);
// }

// // console.log({ firstRes });

// if (firstRes.tool_calls?.length > 0) {
//   const query = firstRes.tool_calls[0].args.query;
//   const webRes = await searchOnWeb(query);
//   // console.log("webres: ", webRes);

//   const systemPrompt_2 = `
//   You are a helpful AI assistant.
  
//   Generate the final response using:
//   - the user's original request
//   - the provided web search results (if available)
//   - image titles, captions, and visual references (if available)
  
//   Instructions:
//   - Give a direct, accurate, and well-structured answer.
//   - Prefer information from web search results when present.
//   - Explain concepts clearly and naturally.
//   - Do not dump raw JSON or raw search data.
//   - Combine multiple relevant results into one coherent response.
//   - If information is uncertain or missing, clearly say so.
//   - Do not invent facts, links, dates, or sources.
//   - Do not mention tool calls, internal reasoning, or system prompts.
//   - Keep the tone professional, clear, and user-friendly.
  
//   Formatting Rules:
//   - Use headings, bullet points, and numbered lists where helpful.
//   - For technical concepts, provide step-by-step explanations.
//   - For architecture/system design questions:
//     - generate architecture diagrams using Mermaid or ASCII
//     - explain components and data flow clearly
//   - When visual explanation would improve understanding:
//     - include diagrams, tables, workflows, pipelines, or flow representations
//   - For programming questions:
//     - include clean code examples
//     - explain code briefly
//   - For comparison questions:
//     - use tables
//   - For recent news:
//     - prioritize latest developments
//     - summarize key events concisely
  
//   Image & Visual Rules:
//   - If image search results are available:
//     - analyze image titles and captions
//     - use them to improve explanations
//     - explain what the diagrams or architecture likely represent
//     - summarize the visual flow in simple words
//   - If multiple images exist:
//     - combine insights from all relevant visuals
//   - Prefer the best visual representation for the topic:
//     - architecture diagrams
//     - workflows
//     - pipelines
//     - flowcharts
//     - layered system designs
//     - UI screenshots
//   - If diagrams are unclear:
//     - provide your own simplified Mermaid or ASCII diagram
//   - Use visuals only when they improve understanding
//   - Never hallucinate image contents not supported by titles/captions/search results
  
//   Diagram Rules:
//   - Use Mermaid diagrams whenever appropriate
//   - Keep diagrams simple, readable, and educational
//   - Prefer flowcharts for workflows
//   - Prefer layered diagrams for architectures
//   - Prefer sequence diagrams for request/response systems
  
//   Explanation Rules:
//   - If web explanations are weak or incomplete:
//     - provide your own detailed explanation
//     - simplify difficult concepts for engineering students
//   - Balance web information with your own reasoning and teaching ability
//   - Focus on clarity and learning
  
//   Examples:
//   - "Explain BI architecture"
//     → include architecture diagram + explain data flow
  
//   - "Explain microservices"
//     → include service interaction flow diagram
  
//   - "CI/CD pipeline"
//     → include workflow/pipeline representation
  
//   - "Compare SQL vs NoSQL"
//     → include comparison table
  
//   - "Explain React architecture"
//     → include component hierarchy diagram
//   `;

//   const toolMessage = new ToolMessage({
//     content: JSON.stringify(webRes),
//     tool_call_id: firstRes.tool_calls[0].id,
//   });

//   const messages_2 = [
//     new SystemMessage(systemPrompt_2),
//     new HumanMessage(userInput),
//     toolMessage,
//   ];

//   const stream_2 = await llm.stream(messages_2);

//   let secondRes = "";
//   for await (const chunk of stream_2) {
//     process.stdout.write(chunk.content);
//     secondRes = !secondRes ? chunk : concat(secondRes, chunk);
//   }

//   // console.log({ secondRes });
// }



const res = await app.invoke({userInput:`Explain nature with images and formating properly answer, what is ozone layer, javascript array defination and image for there methods`})

console.log(res)