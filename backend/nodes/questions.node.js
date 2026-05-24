import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { questionsLLM } from "../schemas/questions.schema.js";

export const questionsNode = async (state) => {
  console.log("🔥 QUESTIONS NODE HIT");
  if (!state.userInput) {
    return {};
  }
  const messages = [
    new SystemMessage(`You are an AI agent that extracts questions from the user's request.

Your task:
- Identify all questions or topics from the user input.
- Generate a clear web search query for each extracted question.

Rules (Strictly Follow):
- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT add explanations or extra text.
- Output must always be an array.
- If no meaningful question exists, return an empty array [].
- DONT SKIP ANY QUESTION EVEN SMALL

Output format:

[
  {
    "que": "Extracted question",
    "query": "Optimized web search query"
  }
]

Field meanings:
- que  → the extracted user question/topic
- query → a clean and optimized query for web search`),
    new HumanMessage(state.userInput),
  ];


  const res = await questionsLLM.invoke(messages);
  console.log(
    JSON.stringify(
      {
        extractedQuestions: res,
      },
      null,
      2
    )
  );

  return {
    extractedQuestions: res,
  };
};
