import chalk from 'chalk';

export async function reportCommand(path: string, options: any) {
  console.log(chalk.green(`Generating HTML report for: ${path}`));
  console.log(chalk.yellow('Output directory:'), options.output);

  // Todo
  console.log(chalk.red(`This command stills under development`));
  console.log(chalk.blue('📈 Report generation completed!'));
}
