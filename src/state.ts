import { Annotation } from "@langchain/langgraph";

/**
 * The shared state passed between all nodes in the graph.
 */
export const AgentState = Annotation.Root({
  // ── Inputs ──────────────────────────────────────────────────────────────
  /** Raw TypeScript source of the component / service under test */
  componentCode: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),

  /** Inline HTML template (empty string for services) */
  templateCode: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),

  /** Absolute path to the source file (used to derive the output path) */
  filePath: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),

  /** Root of the Angular project — where jest.config / node_modules live */
  projectRoot: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),

  // ── Working state ────────────────────────────────────────────────────────
  /** The spec file content produced by the generator */
  generatedSpec: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),

  /** Accumulated error messages from static validator + test runner */
  errorLog: Annotation<string[]>({
    reducer: (x, y) => (y.length === 0 ? [] : [...x, ...y]),
    default: () => [],
  }),

  /** How many generation attempts have been made */
  attempts: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),

  /** Whether the spec passed static validation */
  isPassed: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),

  /** Whether the spec passed the actual Jest test run */
  testPassed: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),

  /** Raw Jest output from the last test run (for debugging) */
  testOutput: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
});

/** Convenience type alias for the full graph state */
export type GraphState = typeof AgentState.State;