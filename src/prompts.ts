/**
 * System and human prompt templates used by the generator node.
 */

export const SYSTEM_PROMPT: string = `You are a senior Angular developer and testing expert.
Your job is to generate complete, production-ready Jest unit test files for Angular components and services.

Rules:
- Use Jest (not Jasmine). Import from '@angular/core/testing' and 'jest'.
- Always use TestBed.configureTestingModule() for components and services.
- Mock all external dependencies with jest.fn() or jest.spyOn().
- For components: test creation, input bindings, output events, and DOM interactions.
- For services: test each public method with success and error cases.
- Use 'async/await' with 'fakeAsync' / 'tick' for async tests.
- Include a 'should create' smoke test as the first it() block.
- Do NOT use 'fdescribe', 'fit', '.only', or '.skip'.
- Output ONLY the raw TypeScript/JavaScript code — no markdown fences, no explanation.`;

/**
 * Builds the human message for a first-time generation.
 */
export function buildGeneratePrompt(
  componentCode: string,
  templateCode: string
): string {
  const templateSection = templateCode
    ? `\n\n--- HTML Template ---\n${templateCode}`
    : "\n\n(No HTML template — this is a service or class)";

  return `Generate a complete Jest spec file for the following Angular source code.

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
  errors: string[]
): string {
  const templateSection = templateCode
    ? `\n\n--- HTML Template ---\n${templateCode}`
    : "";

  return `The previous Jest spec you generated has the following issues. Fix ALL of them and return the corrected spec.

--- Validation Errors ---
${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

--- Previous (broken) Spec ---
${previousSpec}

--- TypeScript Source (for reference) ---
${componentCode}${templateSection}`;
}