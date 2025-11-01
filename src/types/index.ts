export interface CodeMetrics {
  filePath: string;
  lines: {
    total: number;
    code: number;
    comment: number;
    blank: number;
  };
  complexity: number;
  functions: number;
  classes: number;
  duplication: {
    percentage: number;
    duplicatedLines: number;
  };
  unusedVariables: string[];
  unusedImports: string[];
  typeIssues: string[];
}

export interface RawAnalysisOptions {
  include?: string[];
  exclude?: string[];
  maxComplexity: string;
  format?: 'table' | 'json';
}

export interface AnalysisOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  maxComplexity?: number;
  format?: 'table' | 'json';
}
