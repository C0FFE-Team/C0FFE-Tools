import chalk from "chalk";
import { loadRunning, isProcessAlive } from "../utils/process.js";
import { log } from "../utils/log.js";

export async function psCommand(): Promise<void> {
  const state = loadRunning();

  if (state.features.length === 0) {
    log.info("No dev servers running.");
    return;
  }

  log.header("Running Dev Servers");

  for (const feature of state.features) {
    const elapsed = getElapsed(feature.startedAt);
    console.log(
      chalk.bold.cyan(feature.featureSlug) +
        chalk.dim(` (up ${elapsed})`)
    );
    console.log(chalk.dim(`  https://${feature.domain}`));
    console.log();

    for (const proc of feature.processes) {
      const alive = isProcessAlive(proc.pid);
      const status = alive
        ? chalk.green("alive")
        : chalk.red("dead");

      console.log(
        `  ${chalk.white(proc.repoName)} ${chalk.dim(`(${proc.stack})`)}` +
          `  port ${chalk.yellow(String(proc.port))}` +
          `  PID ${proc.pid} ${status}`
      );
    }
    console.log();
  }
}

function getElapsed(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}h${remainMinutes}m`;
}
