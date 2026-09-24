import { Agent } from "@anvia/core";
import { BASE_INSTRUCTIONS } from "./instructions.js";
import { getModel } from "./models.js";
import { tools } from "./sandbox.js";

export function createAgent() {
  return new Agent({
    id: "assistant",
    model: getModel(),
    instructions: BASE_INSTRUCTIONS,
    tools: [...tools],
  });
}
