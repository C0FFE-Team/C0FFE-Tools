import { existsSync, readFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { loadRegistry, loadHarnessConfig } from "../utils/config.js";
import { HARNESS_DIR, HARNESS_MEMORY_DIR } from "../constants.js";
import { log } from "../utils/log.js";

interface StatusOptions {
  client?: string;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const registry = loadRegistry();

  if (registry.clients.length === 0) {
    log.info("No clients registered. Run `coff add-client <name>` first.");
    return;
  }

  const clients = options.client
    ? registry.clients.filter(
        (c) => c.slug === options.client || c.name === options.client
      )
    : registry.clients;

  if (clients.length === 0) {
    log.error(`Client "${options.client}" not found.`);
    return;
  }

  for (const client of clients) {
    console.log(chalk.bold.cyan(`\n${client.name}`));

    if (client.projects.length === 0) {
      console.log(chalk.dim("  (no projects)"));
      continue;
    }

    for (const project of client.projects) {
      const config = loadHarnessConfig(project.path);
      const reposLabel =
        config && config.repos && config.repos.length > 0
          ? config.repos
              .map((r) => `${r.name} ${chalk.dim(`[${r.stack}]`)}`)
              .join(" | ")
          : "";
      const pathExists = existsSync(project.path);
      const statusIcon = pathExists ? chalk.green("●") : chalk.red("●");

      console.log(`  ${statusIcon} ${chalk.white(project.name)}`);
      if (reposLabel) {
        console.log(`    ${reposLabel}`);
      }
      console.log(chalk.dim(`    ${project.path}`));

      // Show features if available
      const featuresPath = join(
        project.path,
        HARNESS_DIR,
        HARNESS_MEMORY_DIR,
        "features.md"
      );
      if (existsSync(featuresPath)) {
        const content = readFileSync(featuresPath, "utf-8");
        const lines = content.split("\n").filter((l) => l.startsWith("- ["));
        const done = lines.filter((l) => l.startsWith("- [x]")).length;
        const total = lines.length;
        if (total > 0) {
          console.log(
            chalk.dim(`    Features: ${done}/${total} complete`)
          );
        }
      }
    }
  }
  console.log();
}
