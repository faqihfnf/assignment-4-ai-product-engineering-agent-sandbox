# Agent sandbox teaching starter

A small Anvia agent with Docker Sandbox tools and Studio. The lesson starts with one plain instruction, then changes it after observing tool calls.

## Setup

```sh
pnpm install
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. If you use an OpenAI-compatible provider, also set `OPENAI_BASE_URL` and, if needed, `OPENAI_MODEL`.
Start Docker before running the agent.

## Run

```sh
pnpm start
```

Open `http://localhost:3000` and try: “Create hello.txt in the sandbox, then read it back to me.” Inspect the tool calls and sandbox files in Studio. Edit `src/instructions.ts` only when a run shows a specific problem, then rerun the same task.

Run `pnpm typecheck` to check the TypeScript code. The longer instruction draft from preparation is saved in `teaching/instructions-after-testing.md`.
