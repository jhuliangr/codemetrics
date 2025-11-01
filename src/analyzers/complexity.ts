import { CodeMetrics, AnalysisOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export async function analyzeCodebase(
  basePath: string,
  options: AnalysisOptions,
): Promise<CodeMetrics[]> {
  const results: CodeMetrics[] = [];

  async function analyzeDirectory(dirPath: string) {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (!shouldExclude(fullPath, options.excludePatterns || [])) {
          await analyzeDirectory(fullPath);
        }
      } else if (shouldInclude(fullPath, options.includePatterns || [])) {
        const metrics = await analyzeFile(fullPath);
        results.push(metrics);
      }
    }
  }

  await analyzeDirectory(basePath);
  return results;
}

function shouldInclude(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'));
    return regex.test(filePath);
  });
}

function shouldExclude(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'));
    return regex.test(filePath);
  });
}

async function analyzeFile(filePath: string): Promise<CodeMetrics> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const unusedVars = findUnusedVariables(content);
  const unusedImports = findUnusedImports(content);
  const typeIssues = isTS ? detectUnsafeTypes(content) : [];

  return {
    filePath,
    lines: {
      total: lines.length,
      code: countCodeLines(lines),
      comment: countCommentLines(lines),
      blank: countBlankLines(lines),
    },
    complexity: calculateComplexity(content),
    functions: countFunctions(content),
    classes: countClasses(content),
    duplication: {
      percentage: calculateDuplication(content),
      duplicatedLines: 0,
    },
    unusedVariables: unusedVars,
    unusedImports,
    typeIssues,
  };
}

function findUnusedVariables(content: string): string[] {
  const varPattern = /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)/g;
  const declaredVars = new Set<string>();
  let match;

  while ((match = varPattern.exec(content)) !== null) {
    declaredVars.add(match[1]);
  }

  const allIdentifiers = Array.from(
    content.matchAll(/\b[a-zA-Z_$][\w$]*\b/g),
  ).map((m) => m[0]);

  const unused = Array.from(declaredVars).filter((v) => {
    const occurrences = allIdentifiers.filter((id) => id === v).length;
    return occurrences <= 1;
  });

  return unused;
}

function findUnusedImports(content: string): string[] {
  const importPattern = /import\s+([^'";]+)\s+from\s+['"][^'"]+['"]/g;
  const importedNames: string[] = [];
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    const clause = match[1]
      .replace(/{|}|\* as/g, '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    importedNames.push(...clause);
  }

  const allIdentifiers = Array.from(
    content.matchAll(/\b[a-zA-Z_$][\w$]*\b/g),
  ).map((m) => m[0]);

  const unused = importedNames.filter((name) => {
    const occurrences = allIdentifiers.filter((id) => id === name).length;
    return occurrences <= 1;
  });

  return unused;
}

function detectUnsafeTypes(content: string): string[] {
  const issues: string[] = [];
  const anyPattern = /:\s*any\b/g;
  const unknownPattern = /:\s*unknown\b/g;

  if (anyPattern.test(content)) issues.push('"any" type usage detected');
  if (unknownPattern.test(content))
    issues.push('Use of type "unknown" detected');

  return issues;
}

function countCodeLines(lines: string[]): number {
  return lines.filter(
    (line) =>
      line.trim().length > 0 &&
      !line.trim().startsWith('//') &&
      !line.trim().startsWith('/*') &&
      !line.trim().startsWith('*'),
  ).length;
}

function countCommentLines(lines: string[]): number {
  return lines.filter(
    (line) =>
      line.trim().startsWith('//') ||
      line.trim().startsWith('/*') ||
      line.trim().startsWith('*') ||
      line.includes('/*') ||
      line.includes('*/'),
  ).length;
}

function countBlankLines(lines: string[]): number {
  return lines.filter((line) => line.trim().length === 0).length;
}

function calculateComplexity(content: string): number {
  const complexityPatterns = [
    /\bif\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\b&&/g,
    /\b\|\|/g,
  ];

  return complexityPatterns.reduce((count, pattern) => {
    const matches = content.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 1);
}

function countFunctions(content: string): number {
  const functionPatterns = [
    /\bfunction\s+(\w+)\s*\(/g,
    /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,
    /let\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,
    /(\w+)\s*\([^)]*\)\s*\{/g,
  ];

  return functionPatterns.reduce((count, pattern) => {
    const matches = content.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function countClasses(content: string): number {
  return (content.match(/\bclass\s+(\w+)/g) || []).length;
}

function calculateDuplication(content: string): number {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const uniqueLines = new Set(lines);
  return ((lines.length - uniqueLines.size) / lines.length) * 100;
}
