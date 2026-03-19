import { TestFramework } from "./utils.js";


/**
 * System and human prompt templates used by the generator node.
 */
export function buildSystemPrompt(framework: TestFramework): string {
  const isVitest = framework === TestFramework.vitest;

  const frameworkRules = isVitest
    ? `- Use Vitest (not Jest/Jasmine). Import test functions from 'vitest' (e.g. \`import { describe, it, expect, vi, beforeEach } from 'vitest'\`).
- Use \`vi.fn()\` and \`vi.spyOn()\` instead of \`jest.fn()\` / \`jest.spyOn()\`.
- Use \`vi.useFakeTimers()\` / \`vi.runAllTicks()\` instead of Jest's fake timers.
- Do NOT import from 'jest' — all test utilities come from 'vitest'.`
    : `- Use Jest (not Jasmine). Import from '@angular/core/testing' and 'jest'.
- Use \`jest.fn()\` and \`jest.spyOn()\` for mocking.
- Use \`fakeAsync\` / \`tick\` for async tests.`;

  return `You are a senior Angular developer and testing expert.
Your job is to generate complete, production-ready ${isVitest ? "Vitest" : "Jest"} unit test files for Angular components and services.
Rules:
${frameworkRules}
- Always use TestBed.configureTestingModule() for components and services.
- Mock all external dependencies.
- For components: test creation, input bindings, output events, and DOM interactions.
- For services: test each public method with success and error cases.
- Use 'async/await' for async tests.
- Include a 'should create' smoke test as the first it() block.
- Do NOT use 'fdescribe', 'fit', '.only', or '.skip'.
- Output ONLY the raw TypeScript/JavaScript code — no markdown fences, no explanation.`;
}

/**
 * Builds the human message for a first-time generation.
 */
export function buildGeneratePrompt(
  componentCode: string,
  templateCode: string,
  framework: TestFramework
): string {
  const templateSection = templateCode
    ? `\n\n--- HTML Template ---\n${templateCode}`
    : "\n\n(No HTML template — this is a service or class)";

  return `Generate a complete ${framework === TestFramework.vitest ? "Vitest" : "Jest"} spec file for the following Angular source code.
--- TypeScript Source ---
${componentCode}${templateSection}`;
}

/**
 * Builds the human message when re-generating after validation errors.
 */
export function buildFixPrompt(
  componentCode: string,
  templateCode: string,
  previousSpec: string,
  errors: string[],
  framework: TestFramework
): string {
  const templateSection = templateCode
    ? `\n\n--- HTML Template ---\n${templateCode}`
    : "";

  const frameworkName = framework === TestFramework.vitest? "Vitest" : "Jest";

  return `The previous ${frameworkName} spec you generated has the following issues. Fix ALL of them and return the corrected spec.
--- Validation Errors ---
${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}
--- Previous (broken) Spec ---
${previousSpec}
--- TypeScript Source (for reference) ---
${componentCode}${templateSection}`;
}