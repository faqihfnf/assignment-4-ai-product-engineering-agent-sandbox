import { Studio } from "@anvia/studio";
import { createResearchAgent } from "./agents.js";
import { createResearchSandbox } from "./sandbox.js";

const { sandbox, tools } = await createResearchSandbox();
const agent = createResearchAgent(tools);

export const studio = new Studio([agent], {
  sandboxes: [
    {
      inspector: sandbox.inspector({ files: true }),
      agentIds: [agent.id],
      toolNames: tools.map((tool) => tool.name),
    },
  ],
}).serve({
  port: 3000,
  onShutdown: async () => sandbox.destroy(),
});
