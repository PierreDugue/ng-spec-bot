import "dotenv/config";
import path from "path";
import fs from "fs";
import { graph } from "./graph.js";
import { getAngularContext, writeSpec } from "./tools/file-reader.js";
import type { GraphState } from "./state.js";

/**
 * Walks up the directory tree until it finds a package.json,
 * which we treat as the Angular project root.
 */
function findProjectRoot(fromPath: string): string {
  let dir = path.dirname(fromPath);
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.dirname(fromPath);
    dir = parent;
  }
}

async function run(): Promise<void> {
  // ── 1. Resolve the target file ──────────────────────────────────────────
  const filePath: string | undefined = process.argv[2];

  if (!filePath) {
    console.error(
      "Usage: npx tsx src/index.ts <path/to/component-or-service.ts> [project-root]\n"
    );
    process.exit(1);
  }

  const {
    componentCode,
    templateCode,
    filePath: absolutePath,
  } = getAngularContext(filePath);

  // Project root: optional second CLI arg, otherwise auto-detect via package.json
  const projectRoot: string = process.argv[3]
    ? path.resolve(process.argv[3])
    : findProjectRoot(absolutePath);

  console.log(`\n🚀 Angular Test Agent`);
  console.log(`   Target  : ${absolutePath}`);
  console.log(`   Template: ${templateCode ? "found" : "none (service)"}`);
  console.log(`   Project : ${projectRoot}\n`);

  // ── 2. Run the graph ─────────────────────────────────────────────────────
  const initialInput: Partial<GraphState> = {
    componentCode,
    templateCode,
    filePath: absolutePath,
    projectRoot,
    attempts: 0,
    errorLog: [],
    isPassed: false,
    testPassed: false,
    testOutput: "",
    generatedSpec: "",
  };

  const stream = await graph.stream(initialInput, { streamMode: "updates" });

  for await (const update of stream) {
    const nodeName = Object.keys(update)[0];
    console.log(`\n--- Node: [${nodeName}] ---`);
  }

  // ── 3. Get the fully merged final state ─────────────────────────────────
  const finalState: GraphState = await graph.invoke(initialInput);

  // ── 4. Write output ──────────────────────────────────────────────────────
  if (!finalState.generatedSpec) {
    console.error("\n💀 No spec was generated. Check errors above.");
    process.exit(1);
  }

  const specPath = writeSpec(absolutePath, finalState.generatedSpec);

  console.log(`\n🎉 Done!`);
  console.log(`   Static validation : ${finalState.isPassed   ? "✅ passed" : "⚠️  failed"}`);
  console.log(`   Jest run          : ${finalState.testPassed ? "✅ all tests green" : "⚠️  some tests failed"}`);
  console.log(`   Written to        : ${specPath}\n`);
}

run().catch((err: unknown) => {
  console.error("💀 Fatal error:", err);
  process.exit(1);
});