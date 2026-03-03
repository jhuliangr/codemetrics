import { CodeMetrics, AnalysisOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind, ts } from 'ts-morph';

const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: {
    allowJs: true,
    checkJs: true,
  },
});

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
  const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

  const sourceFile = project.createSourceFile(filePath, content, {
    overwrite: true,
  });

  const lines = content.split('\n');
  const unusedVars = isTS
    ? findUnusedVariablesAST(sourceFile)
    : findUnusedVariablesRegex(content);
  const unusedImports = findUnusedImportsAST(sourceFile);
  const typeIssues = isTS ? detectUnsafeTypesAST(sourceFile) : [];
  const deadCode = findDeadCodeAST(sourceFile);

  return {
    filePath,
    lines: {
      total: lines.length,
      code: countCodeLines(lines),
      comment: countCommentLines(lines),
      blank: countBlankLines(lines),
    },
    complexity: calculateComplexityAST(sourceFile),
    functions: countFunctionsAST(sourceFile),
    classes: countClassesAST(sourceFile),
    duplication: {
      percentage: calculateDuplication(content),
      duplicatedLines: 0,
    },
    unusedVariables: unusedVars,
    unusedImports,
    typeIssues,
    deadCode,
  };
}

function findUnusedVariablesAST(sourceFile: any): string[] {
  const declaredVars = new Map<string, number>();
  const usedVars = new Set<string>();

  sourceFile.forEachDescendant((node: any) => {
    if (node.getKind() === SyntaxKind.VariableDeclaration) {
      const nameNode = node.getNameNode();
      const name = nameNode?.getText();
      if (name && typeof name === 'string') {
        declaredVars.set(name, (declaredVars.get(name) || 0) + 1);
      }
    }

    if (node.getKind() === SyntaxKind.Identifier) {
      usedVars.add(node.getText());
    }
  });

  const unused: string[] = [];
  declaredVars.forEach((count, varName) => {
    if (!usedVars.has(varName)) {
      unused.push(varName);
    }
  });

  return unused;
}

function findUnusedVariablesRegex(content: string): string[] {
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

function findUnusedImportsAST(sourceFile: any): string[] {
  const importedNames = new Map<string, string>();
  const usedNames = new Set<string>();

  const importDeclarations = sourceFile.getImportDeclarations();
  const importRanges: any[] = [];

  for (const importDecl of importDeclarations) {
    const moduleName = importDecl.getModuleSpecifier().getText();
    importRanges.push({
      start: importDecl.getStart(),
      end: importDecl.getEnd(),
    });

    const namedImports = importDecl.getNamedImports();

    for (const namedImport of namedImports) {
      const name = namedImport.getName();
      importedNames.set(name, moduleName);
    }

    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport && typeof defaultImport.getName === 'function') {
      importedNames.set(defaultImport.getName(), moduleName);
    }

    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport && typeof namespaceImport.getName === 'function') {
      importedNames.set(namespaceImport.getName(), moduleName);
    }
  }

  sourceFile.forEachDescendant((node: any) => {
    if (node.getKind() === SyntaxKind.Identifier) {
      const text = node.getText();
      const start = node.getStart();
      const end = node.getEnd();

      const isInImport = importRanges.some(
        (r) => start >= r.start && end <= r.end,
      );

      if (!isInImport && text) {
        usedNames.add(text);
      }
    }
  });

  sourceFile.forEachDescendant((node: any) => {
    if (
      node.getKind() === SyntaxKind.TypeReference ||
      node.getKind() === SyntaxKind.TypeAliasDeclaration ||
      node.getKind() === SyntaxKind.InterfaceDeclaration ||
      node.getKind() === SyntaxKind.ClassDeclaration
    ) {
      const typeName = node.getNameNode?.()?.getText() || node.getName?.();
      if (typeName) {
        usedNames.add(typeName);
      }
    }
  });

  const unused: string[] = [];
  importedNames.forEach((module, name) => {
    if (!usedNames.has(name)) {
      unused.push(name);
    }
  });

  return unused;
}

function detectUnsafeTypesAST(sourceFile: any): string[] {
  const issues: string[] = [];

  sourceFile.forEachDescendant((node: any) => {
    if (
      node.getKind() === SyntaxKind.TypeReference ||
      node.getKind() === SyntaxKind.TupleType
    ) {
      const typeNode = node.getType();
      if (typeNode) {
        const typeText = typeNode.getText();
        if (typeText === 'any') {
          issues.push('"any" type usage detected');
        } else if (typeText === 'unknown') {
          issues.push('Use of type "unknown" detected');
        }
      }
    }
  });

  return [...new Set(issues)];
}

function findDeadCodeAST(sourceFile: any): string[] {
  const deadCode: string[] = [];

  const functions = sourceFile.getFunctions();
  for (const func of functions) {
    const name = func.getName();
    const isExported = func
      .getModifiers()
      ?.some((m: any) => m.getKind() === SyntaxKind.ExportKeyword);

    if (name && !isExported) {
      const refs = func.findReferencesAsNodes();
      if (refs.length <= 1) {
        deadCode.push(`Unused function: ${name}`);
      }
    }
  }

  const classes = sourceFile.getClasses();
  for (const cls of classes) {
    const name = cls.getName();
    const isExported = cls
      .getModifiers()
      ?.some((m: any) => m.getKind() === SyntaxKind.ExportKeyword);

    if (name && !isExported) {
      const refs = cls.findReferencesAsNodes();
      if (refs.length <= 1) {
        deadCode.push(`Unused class: ${name}`);
      }
    }
  }

  return deadCode;
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

function calculateComplexityAST(sourceFile: any): number {
  let count = 1;

  sourceFile.forEachDescendant((node: any) => {
    const kind = node.getKind();
    if (
      kind === SyntaxKind.IfStatement ||
      kind === SyntaxKind.ForStatement ||
      kind === SyntaxKind.WhileStatement ||
      kind === SyntaxKind.CaseClause ||
      kind === SyntaxKind.CatchClause ||
      kind === SyntaxKind.BinaryExpression
    ) {
      count++;
    }
  });

  return count;
}

function countFunctionsAST(sourceFile: any): number {
  let count = 0;

  sourceFile.getFunctions().forEach(() => count++);

  sourceFile.forEachDescendant((node: any) => {
    if (node.getKind() === SyntaxKind.ArrowFunction) {
      count++;
    }
  });

  return count;
}

function countClassesAST(sourceFile: any): number {
  return sourceFile.getClasses().length;
}

function calculateDuplication(content: string): number {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const uniqueLines = new Set(lines);
  return ((lines.length - uniqueLines.size) / lines.length) * 100;
}
