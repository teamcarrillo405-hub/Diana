import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { expectedEducationalEvaluationTier } from "./routing-contract";

const EVALUATION_ROOT = path.join(process.cwd(), "lib/educational-evaluation");

function runtimeModuleSpecifiers(filePath: string): string[] {
  const source = ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const specifiers: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      if (!node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      if (!node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return specifiers;
}

function resolveLocalModule(importer: string, specifier: string): string {
  const base = path.resolve(path.dirname(importer), specifier);
  const candidates = [base, `${base}.ts`, path.join(base, "index.ts")];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${importer}.`);
  return path.normalize(resolved);
}

function runtimeDependencyClosure(entryPath: string): string[] {
  const pending = [path.normalize(entryPath)];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const filePath = pending.pop()!;
    if (visited.has(filePath)) continue;
    visited.add(filePath);
    for (const specifier of runtimeModuleSpecifiers(filePath)) {
      expect(specifier, `runtime import in ${filePath}`).toMatch(/^\./u);
      const dependency = resolveLocalModule(filePath, specifier);
      expect(dependency.startsWith(`${EVALUATION_ROOT}${path.sep}`)).toBe(true);
      pending.push(dependency);
    }
  }

  return [...visited].sort();
}

describe("independent educational evaluation routing contract", () => {
  it("keeps benchmark expectations independent from production routing code", () => {
    const closure = runtimeDependencyClosure(path.join(EVALUATION_ROOT, "corpus.ts"));
    expect(closure.map((filePath) => path.relative(EVALUATION_ROOT, filePath)))
      .toEqual([
        "contracts.ts",
        "corpus.ts",
        "routing-contract.ts",
      ]);
  });

  it("uses the frozen benchmark tiers across representative bands and routes", () => {
    expect(expectedEducationalEvaluationTier({
      subject: "science",
      academicBand: "middle_advanced",
      route: "study_buddy",
      stressKind: null,
    })).toBe("fast");
    expect(expectedEducationalEvaluationTier({
      subject: "mathematics",
      academicBand: "high_advanced",
      route: "study_buddy",
      stressKind: null,
    })).toBe("complex");
    expect(expectedEducationalEvaluationTier({
      subject: "english_language_arts",
      academicBand: "postsecondary_advanced",
      route: "assignment_review",
      stressKind: null,
    })).toBe("quality");
    expect(expectedEducationalEvaluationTier({
      subject: "science",
      academicBand: "postsecondary_advanced",
      route: "source_extraction",
      stressKind: null,
    })).toBe("fast");
    expect(expectedEducationalEvaluationTier({
      subject: "science",
      academicBand: "postsecondary_advanced",
      route: "assignment_review",
      stressKind: "source_conflict",
    })).toBe("quality");
  });
});
