import {  END, START, StateGraph } from "@langchain/langgraph";
import { questionsNode } from "../nodes/questions.node.js";
import { researchAnswersNode } from "../nodes/research_answers.node.js";
import z from "zod";

const State = z.object({
  userInput: z.string(),
  extractedQuestions: z.any(),
  finalAnswer: z.any(),
});

const graph = new StateGraph(State);

graph.addNode("questionsNode", questionsNode);

graph.addNode("researchAnswersNode", researchAnswersNode);

graph.addEdge(START, "questionsNode");

graph.addEdge("questionsNode", "researchAnswersNode");

graph.addEdge("researchAnswersNode", END);

export const app = graph.compile();

