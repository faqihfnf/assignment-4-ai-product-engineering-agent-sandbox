# Basic Anvia agent

A small CLI agent using Anvia, its OpenAI adapter, TypeScript, and pnpm. It follows the setup in `agent-evals` without the evals or Lens integration.

## Setup

```sh
pnpm install
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. If you use an OpenAI-compatible provider, also set `OPENAI_BASE_URL` and, if needed, `OPENAI_MODEL`.

## Run

```sh
pnpm start "Explain what an agent is in one sentence"
```

Run `pnpm typecheck` to check the TypeScript code.
