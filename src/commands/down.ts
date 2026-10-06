import { log } from "../utils/log.js";
import { killFeature, loadRunning } from "../utils/process.js";
import { releasePorts } from "../utils/ports.js";
import { writeCaddyfile, reloadCaddy, stopCaddyIfEmpty } from "../utils/caddy.js";

export async function downCommand(featureSlug: string): Promise<void> {
  log.header(`Stopping: ${featureSlug}`);

  const state = loadRunning();
  const feature = state.features.find((f) => f.featureSlug === featureSlug);

  if (!feature) {
    log.warn(`${featureSlug} is not running`);
    return;
  }

  // Kill all processes
  log.info("Stopping processes...");
  await killFeature(featureSlug);
  log.success("Processes stopped");

  // Release ports
  releasePorts(featureSlug);
  log.success("Ports released");

  // Update Caddyfile
  writeCaddyfile();

  // Reload or stop Caddy
  const updated = loadRunning();
  if (updated.features.length > 0) {
    reloadCaddy();
  } else {
    stopCaddyIfEmpty();
  }

  log.success(`${featureSlug} stopped`);
}
