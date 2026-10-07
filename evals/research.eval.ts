import type { Message } from "@anvia/core";
import { createEvalTypes, EvalOutcome, runEvalCli } from "@anvia/core/evals";
import { createResearchAgent } from "../src/agents.js";
import { MODEL_ID } from "../src/models.js";
import { createResearchSandbox, REPORTS_DIR } from "../src/sandbox.js";

/** What one agent run left behind, collected for the checks below. */
type RunTrace = {
  reply: string;
  toolCalls: string[];
  searchedUrls: string[];
  reportPath: string | null;
  report: string;
};

type Check =
  | "answers_correctly"
  | "asks_clarification"
  | "admits_no_result"
  | "no_report_written"
  | "cites_search_source"
  | "report_created"
  | "report_read_back";

type Expected = { checks: Check[]; answerIncludes?: string };

const cases: { id: string; input: string; expected: Expected }[] = [
  {
    id: "clear-answer",
    input: "When was the Python programming language first released?",
    expected: { checks: ["answers_correctly", "report_created"], answerIncludes: "1991" },
  },
  {
    id: "ambiguous-request",
    input: "Research Mercury for me.",
    expected: { checks: ["asks_clarification", "no_report_written"] },
  },
  {
    id: "no-useful-result",
    input: "What is the battery capacity of the Zorblax-9 quantum toaster made by Flimbertech?",
    expected: { checks: ["admits_no_result", "no_report_written"] },
  },
  {
    id: "source-citation",
    input: "Who created the Linux kernel, and in which year was it first released?",
    expected: { checks: ["cites_search_source"] },
  },
  {
    id: "report-file-created",
    input: "Write a short report about the main threats to the Great Barrier Reef.",
    expected: { checks: ["report_created", "report_read_back"] },
  },
];

const URL_PATTERN = /https?:\/\/[^\s"'\\<>]+/g;

const checks: Record<Check, (run: RunTrace, expected: Expected) => boolean> = {
  answers_correctly: (run, expected) => run.reply.includes(expected.answerIncludes ?? ""),
  asks_clarification: (run) => run.reply.includes("?"),
  admits_no_result: (run) =>
    /could ?n['’]?o?t find|could not find|no (reliable|relevant|useful)|unable to find|not able to find|tidak (dapat|bisa) menemukan/i.test(
      run.reply,
    ),
  no_report_written: (run) => run.reportPath === null && !run.toolCalls.includes("write_file"),
  cites_search_source: (run) =>
    run.searchedUrls.some((url) => run.report.includes(url)) &&
    run.searchedUrls.some((url) => run.reply.includes(url)),
  report_created: (run) =>
    run.reportPath !== null && /## Answer/.test(run.report) && /## Sources[\s\S]*https?:\/\//.test(run.report),
  report_read_back: (run) => run.toolCalls.lastIndexOf("read_file") > run.toolCalls.indexOf("write_file"),
};

const researchEvals = createEvalTypes<string, RunTrace, Expected>();

const behaviour = researchEvals.defineMetric({
  name: "behaviour",
  dataType: "NUMERIC",
  evaluate: ({ case: testCase, output }) => {
    const expected = testCase.expected as Expected;
    const failed = expected.checks.filter((name) => !checks[name](output, expected));
    const score = 1 - failed.length / expected.checks.length;
    const comment = failed.length ? `failed: ${failed.join(", ")}` : `passed: ${expected.checks.join(", ")}`;
    return failed.length ? EvalOutcome.fail(score, { comment }) : EvalOutcome.pass(score, { comment });
  },
});

function collectToolActivity(messages: readonly Message[]) {
  const toolCalls: string[] = [];
  const searchedUrls = new Set<string>();
  const searchCallIds = new Set<string>();

  for (const message of messages) {
    if (message.role === "assistant" && typeof message.content !== "string") {
      for (const part of message.content) {
        if (part.type !== "tool-call") continue;
        toolCalls.push(part.toolName);
        if (part.toolName === "web_search") searchCallIds.add(part.toolCallId);
      }
    }
    if (message.role === "tool") {
      const raw = JSON.stringify(message);
      if ([...searchCallIds].some((id) => raw.includes(id))) {
        for (const url of raw.match(URL_PATTERN) ?? []) searchedUrls.add(url);
      }
    }
  }
  return { toolCalls, searchedUrls: [...searchedUrls] };
}

const { sandbox, tools } = await createResearchSandbox();
const agent = createResearchAgent(tools);

async function listReports() {
  const entries = await sandbox.runtime.listFiles({ path: REPORTS_DIR });
  return entries.filter((entry) => entry.type === "file").map((entry) => entry.path);
}

try {
  console.log(`Running research evals with model ${MODEL_ID}...\n`);
  await runEvalCli({
    name: "research agent",
    cases,
    metrics: [behaviour],
    targetConcurrency: 1, // cases share one sandbox, so run them one by one
    caseTimeoutMs: 180_000,
    exitCode: true,
    maxValueLength: 400,
    onProgress: (event) => {
      if (event.type === "case-complete") console.log(`  [${event.completedCases}/${event.totalCases}] ${event.result.case.id}: ${event.result.outcome}`);
    },
    target: async (input, _testCase, context): Promise<RunTrace> => {
      const before = new Set(await listReports());
      const outcome = await agent.generate({ prompt: input, abortSignal: context?.signal });
      const { toolCalls, searchedUrls } = collectToolActivity(outcome.messages);

      const reportPath = (await listReports()).find((path) => !before.has(path)) ?? null;
      const report = reportPath ? await sandbox.runtime.readTextFile({ path: reportPath }) : "";

      return { reply: outcome.text, toolCalls, searchedUrls, reportPath, report };
    },
  });
} finally {
  await sandbox.destroy();
}
