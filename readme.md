# Angular Test Agent

An AI agent that automatically generates Jest unit tests for Angular components and services using LangChain + LangGraph, written in TypeScript.

## How it works

```
START → [generator] → [validator] → END (if passed or max attempts reached)
                           ↓
                     [generator] ← retry with errors as feedback
```

1. **Generator** — sends your component code + template to the LLM, which writes a complete Jest spec.
2. **Validator** — statically checks the spec for required patterns (TestBed, describe, it, expect), forbidden patterns (.only, .skip, console.log), and balanced braces.
3. If validation fails, the errors are fed back to the generator (up to 3 attempts).

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

## Usage

```bash
# Generate tests for a component
npx tsx src/index.ts path/to/foo.component.ts

# Generate tests for a service
npx tsx src/index.ts path/to/foo.service.ts

# Or via npm script
npm run generate path/to/foo.component.ts
```

> `tsx` runs TypeScript directly — no build step needed for development.
> Run `npm run build` to compile to `dist/` for production.

## Configuration

| Env variable         | Default                            | Description                  |
|----------------------|------------------------------------|------------------------------|
| `OPENROUTER_API_KEY` | *(required)*                       | Your OpenRouter API key      |
| `MODEL_NAME`         | `google/gemini-2.0-flash-lite-001` | Any model on OpenRouter      |

Swap to a more powerful model for better results:
```
MODEL_NAME=anthropic/claude-3.5-sonnet
MODEL_NAME=openai/gpt-4o
```

## Project structure

```
src/
├── index.ts            # Entry point — reads file, runs graph, writes spec
├── graph.ts            # LangGraph definition (nodes + edges + routing)
├── state.ts            # Shared agent state (Annotation schema + GraphState type)
├── model.ts            # LLM factory (OpenRouter via LangChain)
├── prompts.ts          # System prompt + human message builders
└── tools/
    ├── file-reader.ts  # Reads .ts / .html files, writes spec to disk
    └── validator.ts    # Static analysis of generated spec
```