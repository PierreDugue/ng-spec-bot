import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export interface RunnerResult {
  passed: boolean;
  errors: string[];
  output: string;
}

/**
 * Writes the spec to a temp file and runs Jest on it.
 * Returns whether all tests passed and any error output.
 *
 * @param spec         - The generated spec content.
 * @param sourceFile   - Path to the original component/service (used to resolve imports).
 * @param projectRoot  - Root of the Angular project (where jest.config lives).
 */
export function runSpec(
  testFramework: string,
  spec: string,
  sourceFile: string,
  projectRoot: string
): RunnerResult {
  // Write spec to a temp file next to the source so relative imports resolve
  const sourceDir = path.dirname(sourceFile);
  const tempSpecPath = path.join(
    sourceDir,
    `__agent_temp_${Date.now()}.spec.ts`
  );

  // Strip markdown fences if present
  const clean = spec
    .replace(/^```(?:typescript|javascript|ts|js)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  try {
    fs.writeFileSync(tempSpecPath, clean, "utf-8");
    let cmd;
    
    if (testFramework === 'jest') {
      // Build the jest command
      // We run only this specific file and bail after first failure for speed
      const jestBin = path.join(projectRoot, "node_modules", ".bin", "jest");
      cmd = `"${jestBin}" --testPathPatterns="${tempSpecPath}" --no-coverage --bail 1 --forceExit`;
    } else {
      cmd = `npx vitest ${tempSpecPath}`
    }

    let output = "";
    try {
      output = execSync(cmd, {
        cwd: projectRoot,
        stdio: "pipe",
        encoding: "utf-8",
        timeout: 60_000, // 60s max
      });

      return { passed: true, errors: [], output };
    } catch (execError: unknown) {
      // execSync throws when Jest exits with non-zero code (test failures)
      const err = execError as { stdout?: string; stderr?: string };
      output = [err.stdout ?? "", err.stderr ?? ""].join("\n");
      const errors = extractTestErrors(output);
      return { passed: false, errors, output };
    }
  } finally {
    // Always clean up the temp file
    if (fs.existsSync(tempSpecPath)) {
      fs.unlinkSync(tempSpecPath);
    }
  }
}

/**
 * Extracts the most useful lines from Jest's or Vitest's error output.
 * Strips ANSI codes and focuses on failure messages.
 */
function extractTestErrors(rawOutput: string): string[] {
  // Strip ANSI escape codes
  const clean = rawOutput.replace(/\x1B\[[0-9;]*m/g, "");
  const errors: string[] = [];
  const lines = clean.split("\n");
  let capturing = false;

  for (const line of lines) {
    // Jest: starts with "●"
    // Vitest: starts with "FAIL" block headers or "❯" / "×" failure markers
    if (
      /^\s*●/.test(line) ||                          // Jest failure block
      /^\s*(FAIL|FAILED)\s+/.test(line) ||           // Vitest file-level failure
      /^\s*[×✕❯]\s+/.test(line) ||                  // Vitest test-level failure markers
      /^\s*AssertionError/.test(line) ||             // Vitest assertion errors
      /^\s*Error:/.test(line)                        // Generic errors (both)
    ) {
      capturing = true;
    }

    // Stop at Jest summary lines or Vitest summary lines
    if (
      capturing &&
      /^(Tests|Test Suites|Snapshots|Time):/.test(line) ||  // Jest summary
      /^(✓|✗|×)?\s*(Test Files|Tests|Duration)\s+/.test(line)   // Vitest summary
    ) {
      capturing = false;
    }

    if (capturing && line.trim().length > 0) {
      errors.push(line);
    }
  }

  // If we couldn't parse specific errors, return a trimmed version of all output
  if (errors.length === 0) {
    return [clean.slice(0, 1500)];
  }

  return errors.slice(0, 40); // cap to avoid overwhelming the LLM
}