import chalk from 'chalk';
import { analyzeCodebase } from '../analyzers/complexity';
import { AnalysisOptions, CodeMetrics, RawAnalysisOptions } from '../types';

export async function analyzeCommand(
  path: string,
  options: RawAnalysisOptions,
) {
  try {
    console.log(chalk.blue(`Analyzing code in: ${path}`));

    const analysisOptions: AnalysisOptions = {
      includePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
      excludePatterns: options.exclude ?? ['/node_modules/', '/dist/'],
      maxComplexity: parseInt(options.maxComplexity),
      format: options.format,
    };

    const results = await analyzeCodebase(path, analysisOptions);

    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      displayTableResults(results);
    }
  } catch (error) {
    console.error(chalk.red('Error during analysis:'), error);
    process.exit(1);
  }
}
function displayTableResults(results: CodeMetrics[]) {
  console.log('\n' + chalk.green.bold('📊 Code Metrics Report'));
  console.log('─'.repeat(80));

  results.forEach((result) => {
    console.log(chalk.blue(`\n📁 ${result.filePath}`));
    console.log(
      `  Lines: ${result.lines.total} (Code: ${result.lines.code}, Comments: ${result.lines.comment})`,
    );
    console.log(`  Complexity: ${chalk.yellow(result.complexity)}`);
    console.log(`  Functions: ${result.functions}, Classes: ${result.classes}`);
    console.log(`  Duplication: ${result.duplication.percentage}%`);
    console.log(
      `  Unused variables: ${
        result.unusedVariables.length === 0
          ? '0'
          : result.unusedVariables.join(', ')
      }`,
    );
    console.log(
      `  Unused imports: ${
        result.unusedImports.length === 0
          ? '0'
          : result.unusedImports.join(', ')
      }`,
    );
    console.log(
      `  Type issues: ${
        result.typeIssues.length === 0 ? '0' : result.typeIssues.join(', ')
      }`,
    );
  });
}
