import { log } from "../utils/log.js";
import { loadRegistry } from "../utils/config.js";

interface SyncOptions {
  project?: string;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  const registry = loadRegistry();

  log.header("C0FFE Tools Sync");
  log.warn(
    "Tracker sync requires the tracker integration to be configured in Claude Code."
  );
  log.info(
    "Use the /coff-solve skill inside Claude Code to sync features with the tracker."
  );
  log.info(
    "This CLI command will be enhanced with direct tracker API access in a future version."
  );

  // List projects that would be synced
  const allProjects = registry.clients.flatMap((c) =>
    c.projects.map((p) => ({ client: c.name, ...p }))
  );

  const projects = options.project
    ? allProjects.filter((p) => p.name === options.project)
    : allProjects;

  if (projects.length === 0) {
    log.info("No projects to sync.");
    return;
  }

  for (const p of projects) {
    log.dim(`  ${p.client} / ${p.name} - ${p.path}`);
  }
}
