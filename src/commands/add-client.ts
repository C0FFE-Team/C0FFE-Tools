import { loadRegistry, saveRegistry, slugify } from "../utils/config.js";
import { log } from "../utils/log.js";

export async function addClientCommand(name: string): Promise<void> {
  const registry = loadRegistry();
  const slug = slugify(name);

  const existing = registry.clients.find((c) => c.slug === slug);
  if (existing) {
    log.error(`Client "${name}" (${slug}) already exists.`);
    process.exit(1);
  }

  registry.clients.push({ name, slug, projects: [] });
  saveRegistry(registry);
  log.success(`Client "${name}" added (slug: ${slug}).`);
}
