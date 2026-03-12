/**
 * Static-analysis validator for the generated Jest spec.
 *
 * Lightweight rule-based checks — no compiler dependency, fast execution.
 */

interface PatternRule {
  pattern: RegExp;
  message: string;
}

interface ValidationResult {
  isPassed: boolean;
  errors: string[];
}

const REQUIRED_PATTERNS: PatternRule[] = [
  { pattern: /TestBed/, message: "Missing Angular TestBed import" },
  { pattern: /describe\s*\(/, message: "Missing describe() block" },
  {
    pattern: /it\s*\(|test\s*\(/,
    message: "Missing at least one it()/test() block",
  },
  {
    pattern: /expect\s*\(/,
    message: "Missing at least one expect() assertion",
  },
];

const FORBIDDEN_PATTERNS: PatternRule[] = [
  {
    pattern: /console\.log\s*\(/,
    message: "Spec contains console.log() — remove debug statements",
  },
  {
    pattern: /\.only\s*\(/,
    message: "Spec contains .only() — tests will be skipped in CI",
  },
  {
    pattern: /\.skip\s*\(/,
    message: "Spec contains .skip() — tests will be skipped",
  },
];

/**
 * Validates a generated Jest spec file using static analysis.
 *
 * @param spec - The raw spec file content.
 * @returns A ValidationResult with isPassed and a list of error messages.
 */
export function validateSpec(spec: string): ValidationResult {
  const errors: string[] = [];

  if (!spec || spec.trim().length === 0) {
    return { isPassed: false, errors: ["Generated spec is empty"] };
  }

  for (const { pattern, message } of REQUIRED_PATTERNS) {
    if (!pattern.test(spec)) {
      errors.push(message);
    }
  }

  for (const { pattern, message } of FORBIDDEN_PATTERNS) {
    if (pattern.test(spec)) {
      errors.push(message);
    }
  }

  // Quick sanity check: balanced braces
  const openBraces = (spec.match(/\{/g) ?? []).length;
  const closeBraces = (spec.match(/\}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    errors.push(
      `Unbalanced braces: ${openBraces} opening vs ${closeBraces} closing`
    );
  }

  return { isPassed: errors.length === 0, errors };
}