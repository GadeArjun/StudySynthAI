import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { questionsLLM } from "../schemas/questions.schema.js";

export const questionsNode = async (state) => {
  console.log("🔥 QUESTIONS NODE HIT");
  if (!state.userInput) {
    return {};
  }
  const messages = [
    new SystemMessage(`Extract all meaningful questions/topics from the user input. Return ONLY valid JSON array.

Format:
[
  {
    "que": "question/topic",
    "searchFor": "data" | "image" | "both" | null,
    "query": "short optimized search query"
  }
]

Rules:
- Never skip sub-questions.
- Use "data" for explanations/facts/latest info.
- Use "image" only for diagram/visual-only requests.
- Use "both" only when text + diagram/images are both needed.
- Use null for math, reasoning, rewrites, coding transforms, summaries, etc.
- query must be short.
- query can be "" only if searchFor is null.
- Return [] if nothing meaningful exists.`),
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
