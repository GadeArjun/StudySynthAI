import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { questionsNode } from "../nodes/questions.node.js";
import { answerNode } from "../nodes/answers.node.js";
import z from "zod";

const State = z.object({
  userInput: z.string(),
  extractedQuestions: z.any(),
  finalAnswer: z.any(),
});

const graph = new StateGraph(State);

graph.addNode("questionsNode", questionsNode);

graph.addNode("answerNode", answerNode);

graph.addEdge(START, "questionsNode");

graph.addEdge("questionsNode", "answerNode");

graph.addEdge("answerNode", END);

export const app = graph.compile();

