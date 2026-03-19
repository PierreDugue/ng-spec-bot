# Angular Test Agent

An AI agent that automatically generates unit tests (vitest by default) for Angular components and services using LangChain + LangGraph, written in TypeScript.

## How it works

```
START → [generator] → [validator] → END (if passed or max attempts reached)
                           ↓
                     [generator] ← retry with errors as feedback
```

1. **Generator** — sends your component code + template to the LLM, which writes a complete spec file.
2. **Validator** — statically checks the spec for required patterns (TestBed, describe, it, expect), forbidden patterns (.only, .skip, console.log), and balanced braces.
3. If validation fails, the errors are fed back to the generator (up to 3 attempts).

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Edit your .env and add your OPENROUTER_API_KEY
```

## Usage

```bash
# Generate tests
npx tsx src/index.ts path/to/foo.ts

# Using jest
npx tsx src/index.ts path/to/foo.ts jest

```

## Configuration

| Env variable         | Default                            | Description                  |
|----------------------|------------------------------------|------------------------------|
| `OPENROUTER_API_KEY` | *(required)*                       | Your OpenRouter API key      |
| `MODEL_NAME`         | `meta-llama/llama-3.3-70b-instruct:free` | Any model on OpenRouter      |

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