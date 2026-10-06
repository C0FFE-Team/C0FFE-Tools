import inquirer from "inquirer";
import { loadRegistry, saveRegistry } from "../utils/config.js";
import { log } from "../utils/log.js";

export async function removeProjectCommand(): Promise<void> {
  const registry = loadRegistry();

  if (registry.clients.length === 0) {
    log.error("No clients registered.");
    process.exit(1);
  }

  // Build flat list of all projects with client context
  const allProjects = registry.clients.flatMap((c) =>
    c.projects.map((p) => ({
      clientSlug: c.slug,
      clientName: c.name,
      projectName: p.name,
      projectPath: p.path,
    }))
  );

  if (allProjects.length === 0) {
    log.error("No projects registered.");
    process.exit(1);
  }

  const { selected } = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: "Select project to remove:",
      choices: allProjects.map((p) => ({
        name: `${p.clientName} / ${p.projectName} (${p.projectPath})`,
        value: `${p.clientSlug}::${p.projectPath}`,
      })),
    },
  ]);

  const [clientSlug, projectPath] = selected.split("::");

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Remove project reference? (files on disk will NOT be deleted)`,
      default: false,
    },
  ]);

  if (!confirm) {
    log.info("Cancelled.");
    return;
  }

  const client = registry.clients.find((c) => c.slug === clientSlug)!;
  client.projects = client.projects.filter((p) => p.path !== projectPath);
  saveRegistry(registry);

  const projectName = allProjects.find((p) => p.projectPath === projectPath)!.projectName;
  log.success(`Project "${projectName}" removed from client "${client.name}".`);
}
