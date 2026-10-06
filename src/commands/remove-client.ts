import inquirer from "inquirer";
import { loadRegistry, saveRegistry } from "../utils/config.js";
import { log } from "../utils/log.js";

export async function removeClientCommand(name: string): Promise<void> {
  const registry = loadRegistry();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const clientIndex = registry.clients.findIndex((c) => c.slug === slug);
  if (clientIndex === -1) {
    log.error(`Client "${name}" not found.`);
    process.exit(1);
  }

  const client = registry.clients[clientIndex];
  const projectCount = client.projects.length;

  const warning =
    projectCount > 0
      ? `Client "${client.name}" has ${projectCount} project(s). This will remove the client and all project references (project files on disk will NOT be deleted).`
      : `Remove client "${client.name}"?`;

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: warning,
      default: false,
    },
  ]);

  if (!confirm) {
    log.info("Cancelled.");
    return;
  }

  registry.clients.splice(clientIndex, 1);
  saveRegistry(registry);
  log.success(`Client "${client.name}" removed.`);
}
