# Pustaka — a small research agent

An [Anvia](https://www.npmjs.com/package/@anvia/core) agent with one focused job: answer a single
research question, save a short sourced report inside a Docker sandbox, and read it back.

| Task | Where |
| --- | --- |
| 01. Simple agent with one focused research task | [src/agents.ts](src/agents.ts), [src/instructions.ts](src/instructions.ts) |
| 02. Sandbox tools to create and read a report file | [src/sandbox.ts](src/sandbox.ts) (`write_file`, `read_file`, `list_files`) |
| 03. Web search tool, source URL in the report | [src/tools/web-search.ts](src/tools/web-search.ts) |
| 04. Five eval cases | [evals/research.eval.ts](evals/research.eval.ts) |

## How it works

1. The agent checks whether the request is clear. If it is ambiguous, it asks one clarifying question and stops.
2. It calls `web_search` (Wikipedia API, no key needed).
3. If nothing relevant is found, it says so instead of guessing.
4. Otherwise it writes `reports/<slug>.md` (Answer / Key points / Sources) in the sandbox and reads it back.

The sandbox is a `debian:bookworm-slim` container with **no network** and no shell tool. Web search
runs on the host, so the container can only read and write files.

## Setup

```sh
pnpm install
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. For an OpenAI-compatible gateway, also set `OPENAI_API_BASE_URL`
(or `OPENAI_BASE_URL`). The default model is `gpt-5.6-luna`; override it with `OPENAI_MODEL`.
Start Docker before running anything.

## Run

```sh
pnpm start      # Studio at http://localhost:3000/playground
pnpm eval       # run the five eval cases
pnpm typecheck
```

Try in Studio: “When was the Python programming language first released?” and check the
`reports/` folder in the sandbox panel. Stop Studio with Ctrl+C so the sandbox container is removed.

## Eval cases

| Case | Prompt | Passes when |
| --- | --- | --- |
| `clear-answer` | When was Python first released? | Reply contains `1991` and a report is written |
| `ambiguous-request` | Research Mercury for me. | Agent asks a question and writes no report |
| `no-useful-result` | Battery capacity of the fictional Zorblax-9 toaster | Agent says it found nothing and writes no report |
| `source-citation` | Who created the Linux kernel, and when? | Report and reply contain a URL that `web_search` actually returned |
| `report-file-created` | Short report on Great Barrier Reef threats | New `reports/*.md` with Answer + Sources, and `read_file` called after `write_file` |

All checks are deterministic (no LLM judge), so a run only costs the agent's own tokens.
