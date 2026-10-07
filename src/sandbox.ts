import { createDockerSandboxTools, DockerSandboxClient } from "@anvia/sandbox";

// Debian ships GNU find, which the sandbox file tools rely on (BusyBox find in Alpine does not work).
const IMAGE = "debian:bookworm-slim";
export const REPORTS_DIR = "reports";

const client = new DockerSandboxClient();

/**
 * One isolated container per research session. The agent only needs to write
 * and read report files, so the sandbox has no network and no shell tool;
 * web search runs on the host through the web_search tool.
 */
export async function createResearchSandbox() {
  await client.pullImage({ image: IMAGE });

  const sandbox = await client.createSandbox({
    image: IMAGE,
    workspace: { type: "ephemeral" },
    network: { mode: "none" },
    directories: [REPORTS_DIR],
    resources: { memoryMb: 256, cpus: 0.5, pidsLimit: 32 },
    runtime: { commandTimeoutMs: 10_000, maxOutputBytes: 32_000 },
  });

  const tools = createDockerSandboxTools({
    sandbox: sandbox.runtime,
    tools: ["write_file", "read_file", "list_files"],
    writeFile: { maxBytes: 16_000 },
  });

  return { sandbox, tools };
}
