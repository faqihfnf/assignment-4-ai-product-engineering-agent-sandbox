import { Agent, type AnyTool } from "@anvia/core";
import { RESEARCH_INSTRUCTIONS } from "./instructions.js";
import { getModel } from "./models.js";
import { webSearchTool } from "./tools/web-search.js";

export function createResearchAgent(sandboxTools: readonly AnyTool[]) {
  return new Agent({
    id: "researcher",
    model: getModel(),
    instructions: RESEARCH_INSTRUCTIONS,
    maxTurns: 8,
    tools: [webSearchTool, ...sandboxTools],
  });
}
