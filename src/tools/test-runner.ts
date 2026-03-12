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

    // Build the jest command
    // We run only this specific file and bail after first failure for speed
    const jestBin = path.join(projectRoot, "node_modules", ".bin", "jest");
    const cmd = `"${jestBin}" --testPathPatterns="${tempSpecPath}" --no-coverage --bail 1 --forceExit`;

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
      const errors = extractJestErrors(output);
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
 * Extracts the most useful lines from Jest's error output.
 * Strips ANSI codes and focuses on failure messages.
 */
function extractJestErrors(rawOutput: string): string[] {
  // Strip ANSI escape codes
  const clean = rawOutput.replace(/\x1B\[[0-9;]*m/g, "");

  const errors: string[] = [];
  const lines = clean.split("\n");

  let capturing = false;
  for (const line of lines) {
    // Start capturing at "● Test suite failed" or "● component ›"
    if (/^\s*●/.test(line)) {
      capturing = true;
    }
    // Stop at Jest summary lines
    if (capturing && /^(Tests|Test Suites|Snapshots|Time):/.test(line)) {
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