import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { analyzeCommand } from './commands/analyze';
import { reportCommand } from './commands/report';

const program = new Command();

console.log(
  chalk.blue(figlet.textSync('CodeMetrics', { horizontalLayout: 'full' })),
);

program
  .name('codemetrics')
  .description('CLI tool for analyzing code metrics')
  .version('0.0.1');

program
  .command('analyze <path>')
  .description('Analyze code metrics in a directory or file')
  .option('-f, --format <type>', 'Output format (table, json)', 'table')
  .option('-e, --exclude <patterns...>', 'Exclude patterns')
  .option('--max-complexity <number>', 'Maximum allowed complexity', '10')
  .action(analyzeCommand);

program
  .command('report <path>')
  .description('Generate detailed HTML report')
  .option('-o, --output <path>', 'Output directory', './codemetrics-report')
  .action(reportCommand);

program.parse();
