import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
import { z } from "zod";
import { searchOnWeb } from "./services/webSearch.service.js";
import { changeLlmConfig, llm } from "./config/llm.js";

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
const systemPrompt_1 = `
You are an AI agent that decides whether a tool call is required based on the user's request.

Rules:
1. If no tool is required, answer directly.
2. If a tool is required:
   - First send a short, friendly status message.
   - Then call the appropriate tool.
3. Always provide both:
   - a normal assistant message
   - and the tool call.
4. Keep status messages short and natural.
   Example:
   User: "Search Python tutorials"
   Assistant: "Searching the web for Python tutorials..."
   [tool call]
5. Do not include years in search queries unless the user explicitly mentions a year.

6. For architecture, workflow, pipeline, flowchart, or system-design related questions:
   - search the web if diagrams, images, or visual references would improve the answer
   - prefer searching for architecture diagrams or visual explanations
   - examples:
     - "Explain BI architecture"
     - "Microservices architecture"
     - "CI/CD pipeline workflow"

7. For recent, real-time, trending, or current-event questions:
   - use web search

8. For conceptual or syllabus-based engineering questions:
   - answer directly unless visual references are necessary for better understanding

9. If visual explanation is useful:
   - search for diagrams, architecture images, workflows, or flowcharts
`;

const userInput = "Exaplin nature with images and formating properly anwer";
const messages_1 = [
  new SystemMessage(systemPrompt_1),
  new HumanMessage(userInput),
];

const llmWithTool = llm.bindTools([webSearch]);

const stream_1 = await llmWithTool.stream(messages_1);

let firstRes = "";
for await (const chunk of stream_1) {
  process.stdout.write(chunk.content);
  firstRes = !firstRes ? chunk : concat(firstRes, chunk);
}

// console.log({ firstRes });

if (firstRes.tool_calls?.length > 0) {
  const query = firstRes.tool_calls[0].args.query;
  const webRes = await searchOnWeb(query);
  // console.log("webres: ", webRes);

  const systemPrompt_2 = `
  You are a helpful AI assistant.
  
  Generate the final response using:
  - the user's original request
  - the provided web search results (if available)
  - image titles, captions, and visual references (if available)
  
  Instructions:
  - Give a direct, accurate, and well-structured answer.
  - Prefer information from web search results when present.
  - Explain concepts clearly and naturally.
  - Do not dump raw JSON or raw search data.
  - Combine multiple relevant results into one coherent response.
  - If information is uncertain or missing, clearly say so.
  - Do not invent facts, links, dates, or sources.
  - Do not mention tool calls, internal reasoning, or system prompts.
  - Keep the tone professional, clear, and user-friendly.
  
  Formatting Rules:
  - Use headings, bullet points, and numbered lists where helpful.
  - For technical concepts, provide step-by-step explanations.
  - For architecture/system design questions:
    - generate architecture diagrams using Mermaid or ASCII
    - explain components and data flow clearly
  - When visual explanation would improve understanding:
    - include diagrams, tables, workflows, pipelines, or flow representations
  - For programming questions:
    - include clean code examples
    - explain code briefly
  - For comparison questions:
    - use tables
  - For recent news:
    - prioritize latest developments
    - summarize key events concisely
  
  Image & Visual Rules:
  - If image search results are available:
    - analyze image titles and captions
    - use them to improve explanations
    - explain what the diagrams or architecture likely represent
    - summarize the visual flow in simple words
  - If multiple images exist:
    - combine insights from all relevant visuals
  - Prefer the best visual representation for the topic:
    - architecture diagrams
    - workflows
    - pipelines
    - flowcharts
    - layered system designs
    - UI screenshots
  - If diagrams are unclear:
    - provide your own simplified Mermaid or ASCII diagram
  - Use visuals only when they improve understanding
  - Never hallucinate image contents not supported by titles/captions/search results
  
  Diagram Rules:
  - Use Mermaid diagrams whenever appropriate
  - Keep diagrams simple, readable, and educational
  - Prefer flowcharts for workflows
  - Prefer layered diagrams for architectures
  - Prefer sequence diagrams for request/response systems
  
  Explanation Rules:
  - If web explanations are weak or incomplete:
    - provide your own detailed explanation
    - simplify difficult concepts for engineering students
  - Balance web information with your own reasoning and teaching ability
  - Focus on clarity and learning
  
  Examples:
  - "Explain BI architecture"
    → include architecture diagram + explain data flow
  
  - "Explain microservices"
    → include service interaction flow diagram
  
  - "CI/CD pipeline"
    → include workflow/pipeline representation
  
  - "Compare SQL vs NoSQL"
    → include comparison table
  
  - "Explain React architecture"
    → include component hierarchy diagram
  `;

  const toolMessage = new ToolMessage({
    content: JSON.stringify(webRes),
    tool_call_id: firstRes.tool_calls[0].id,
  });

  const messages_2 = [
    new SystemMessage(systemPrompt_2),
    new HumanMessage(userInput),
    toolMessage,
  ];

  const stream_2 = await llm.stream(messages_2);

  let secondRes = "";
  for await (const chunk of stream_2) {
    process.stdout.write(chunk.content);
    secondRes = !secondRes ? chunk : concat(secondRes, chunk);
  }

  // console.log({ secondRes });
}
