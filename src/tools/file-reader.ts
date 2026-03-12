import fs from "fs";
import path from "path";

export interface AngularContext {
  componentCode: string;
  templateCode: string;
  filePath: string;
}

/**
 * Reads an Angular component or service file and its optional HTML template.
 *
 * @param tsFilePath - Absolute or relative path to the .ts source file.
 * @returns An AngularContext with the source code, template, and resolved path.
 */
export function getAngularContext(tsFilePath: string): AngularContext {
  const absolutePath = path.resolve(tsFilePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`❌  File not found: ${absolutePath}`);
  }

  const componentCode = fs.readFileSync(absolutePath, "utf-8");

  // Components: foo.component.ts → foo.component.html
  // Services:   foo.service.ts   → no HTML (templateCode stays empty)
  const htmlFilePath = absolutePath.replace(/\.ts$/, ".html");
  const templateCode = fs.existsSync(htmlFilePath)
    ? fs.readFileSync(htmlFilePath, "utf-8")
    : "";

  return { componentCode, templateCode, filePath: absolutePath };
}

/**
 * Writes the generated spec to disk next to the source file.
 * Strips any markdown fences the LLM may have included.
 *
 * @param sourceFilePath - Path to the original .ts source file.
 * @param content        - The raw spec content from the LLM.
 * @returns The path the spec file was written to.
 */
export function writeSpec(sourceFilePath: string, content: string): string {
  const specPath = sourceFilePath.replace(/\.ts$/, ".spec.ts");

  const clean = content
    .replace(/^```(?:typescript|javascript|ts|js)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  fs.writeFileSync(specPath, clean, "utf-8");
  return specPath;
}