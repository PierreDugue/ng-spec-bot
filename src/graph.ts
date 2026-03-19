import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState, type GraphState } from "./state.js";
import { getModel } from "./model.js";
import { validateSpec } from "./tools/validator.js";
import { runSpec } from "./tools/test-runner.js";
import {
  buildSystemPrompt,
  buildGeneratePrompt,
  buildFixPrompt,
} from "./prompts.js";

const MAX_ATTEMPTS = 3;

// ─────────────────────────────────────────────
// NODE 1 — Generator
// Calls the LLM to produce (or fix) the spec.
// ─────────────────────────────────────────────
async function generatorNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  const isRetry: boolean = state.errorLog.length > 0 && !!state.generatedSpec;

  const humanMessage: string = isRetry
    ? buildFixPrompt(
      state.componentCode,
      state.templateCode,
      state.generatedSpec,
      state.errorLog,
      state.testFramework,
      )
    : buildGeneratePrompt(state.componentCode, state.templateCode, state.testFramework);

  console.log(
    isRetry
      ? `  🔄 Retrying generation (attempt ${state.attempts + 1})…`
      : "  ✍️  Generating spec…"
  );

  const response = await getModel().invoke([
    ["system", buildSystemPrompt(state.testFramework)],
    ["human", humanMessage],
  ]);

  return {
    generatedSpec: response.content as string,
    attempts: 1,   // reducer sums this into the running total
    errorLog: [],  // reset so downstream nodes see a clean slate
    isPassed: false,
    testPassed: false,
  };
}

// ─────────────────────────────────────────────
// NODE 2 — Static Validator
// Fast rule-based checks before we bother running Jest.
// ─────────────────────────────────────────────
async function validatorNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { isPassed, errors } = validateSpec(state.generatedSpec);

  if (isPassed) {
    console.log("  ✅ Static validation passed!");
  } else {
    console.log(`  ❌ Static validation failed (${errors.length} issue(s)):`);
    errors.forEach((e) => console.log(`     • ${e}`));
  }

  return { isPassed, errorLog: errors };
}

// ─────────────────────────────────────────────
// NODE 3 — Test Runner
// Actually executes the spec with Jest.
// Only reached when static validation passes.
// ─────────────────────────────────────────────
async function runnerNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  console.log("  🧪 Running tests...");

  const { passed, errors, output } = runSpec(
    state.testFramework,
    state.generatedSpec,
    state.filePath,
    state.projectRoot
  );

  if (passed) {
    console.log("  ✅ All tests passed!");
  } else {
    console.log(`  ❌ Test run failed (${errors.length} error(s)):`);
    errors.slice(0, 5).forEach((e) => console.log(`     ${e}`));
  }

  return {
    testPassed: passed,
    testOutput: output,
    errorLog: errors,   // feed runtime errors back to the generator if needed
  };
}

// ─────────────────────────────────────────────
// ROUTING — after static validator
// Skip the runner if static validation failed.
// ─────────────────────────────────────────────
function routeAfterValidation(state: GraphState): string | typeof END {
  if (!state.isPassed) {
    if (state.attempts >= MAX_ATTEMPTS) {
      console.log(`  ⚠️  Max attempts reached — exiting with last result`);
      return END;
    }
    console.log("  ➡️  Static validation failed → retrying generator");
    return "generator";
  }
  console.log("  ➡️  Routing → runner");
  return "runner";
}

// ─────────────────────────────────────────────
// ROUTING — after test runner
// ─────────────────────────────────────────────
function routeAfterRunner(state: GraphState): string | typeof END {
  if (state.testPassed) {
    console.log("  ➡️  Routing → END (tests green ✅)");
    return END;
  }
  if (state.attempts >= MAX_ATTEMPTS) {
    console.log(`  ⚠️  Max attempts reached — exiting with last result`);
    return END;
  }
  console.log("  ➡️  Tests failed → retrying generator with test errors");
  return "generator";
}

// ─────────────────────────────────────────────
// GRAPH ASSEMBLY
// ─────────────────────────────────────────────
export const graph = new StateGraph(AgentState)
  .addNode("generator", generatorNode)
  .addNode("validator", validatorNode)
  .addNode("runner", runnerNode)
  .addEdge(START, "generator")
  .addEdge("generator", "validator")
  .addConditionalEdges("validator", routeAfterValidation)
  .addConditionalEdges("runner", routeAfterRunner)
  .compile();