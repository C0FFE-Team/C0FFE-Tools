import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { HARNESS_DIR, HARNESS_CONFIG, LOCAL_DOMAIN } from "../constants.js";
import { log } from "../utils/log.js";
import { allocatePorts } from "../utils/ports.js";
import { spawnDevServer, addRunningFeature, loadRunning } from "../utils/process.js";
import { writeCaddyfile, reloadCaddy } from "../utils/caddy.js";
import type { HarnessConfig, RepoConfig, RunningFeature, ProcessEntry } from "../types.js";

interface WorktreeEntry {
  repo: string;
  path: string;
  branch: string;
}

function loadWorktrees(projectPath: string, featureSlug: string): WorktreeEntry[] | null {
  const wtPath = join(projectPath, HARNESS_DIR, "plans", featureSlug, "worktrees.json");
  if (!existsSync(wtPath)) return null;
  return JSON.parse(readFileSync(wtPath, "utf-8"));
}

function resolveRepoPaths(
  projectPath: string,
  config: HarnessConfig,
  featureSlug: string
): Array<{ repo: RepoConfig; cwd: string }> {
  const worktrees = loadWorktrees(projectPath, featureSlug);

  return config.repos.map((repo) => {
    if (worktrees) {
      const wt = worktrees.find((w) => w.repo === repo.name);
      if (wt) {
        return { repo, cwd: resolve(wt.path) };
      }
    }
    // Fallback to original repo path
    return { repo, cwd: resolve(projectPath, repo.path) };
  });
}

// Role ordering for proxy: backend-like roles get path-based routing
const STARTABLE_ROLES = ["backend", "frontend", "site", "worker"];

export async function upCommand(featureSlug: string): Promise<void> {
  log.header(`Starting dev servers: ${featureSlug}`);

  const projectPath = process.cwd();
  const configPath = join(projectPath, HARNESS_DIR, HARNESS_CONFIG);

  if (!existsSync(configPath)) {
    log.error("No .harness/config.json found. Run this from a project root.");
    process.exit(1);
  }

  const config: HarnessConfig = JSON.parse(readFileSync(configPath, "utf-8"));

  // Check if already running
  const running = loadRunning();
  const alreadyRunning = running.features.find((f) => f.featureSlug === featureSlug);
  if (alreadyRunning) {
    log.warn(`${featureSlug} is already running at https://${alreadyRunning.domain}`);
    log.info('Run "coff down ' + featureSlug + '" first to restart.');
    return;
  }

  // Resolve repo paths (worktree or original)
  const repoEntries = resolveRepoPaths(projectPath, config, featureSlug);
  const startable = repoEntries.filter((e) => STARTABLE_ROLES.includes(e.repo.role));

  if (startable.length === 0) {
    log.error("No startable repos found (need backend, frontend, site, or worker role)");
    process.exit(1);
  }

  // Allocate ports
  const roles = startable.map((e) => e.repo.role);
  log.info("Allocating ports...");
  const allocation = await allocatePorts(featureSlug, roles);

  log.success(`Port block: ${allocation.basePort}`);
  for (const [role, port] of Object.entries(allocation.ports)) {
    log.dim(`  ${role}: ${port}`);
  }

  // Spawn dev servers
  log.info("Spawning dev servers...");
  const processes: ProcessEntry[] = [];

  for (const entry of startable) {
    const port = allocation.ports[entry.repo.role];
    if (port === undefined) continue;

    if (!existsSync(entry.cwd)) {
      log.warn(`Skipping ${entry.repo.name}: directory not found (${entry.cwd})`);
      continue;
    }

    const proc = spawnDevServer(
      featureSlug,
      entry.repo.name,
      entry.repo.role,
      entry.repo.stack,
      port,
      entry.cwd
    );
    processes.push(proc);
    log.success(`${entry.repo.name} (${entry.repo.stack}) → PID ${proc.pid} on port ${port}`);
  }

  if (processes.length === 0) {
    log.error("No servers were started");
    process.exit(1);
  }

  // Register running feature
  const domain = `${featureSlug}.${LOCAL_DOMAIN}`;
  const feature: RunningFeature = {
    featureSlug,
    domain,
    basePort: allocation.basePort,
    processes,
    startedAt: new Date().toISOString(),
  };

  addRunningFeature(feature);

  // Update Caddyfile and reload
  log.info("Configuring reverse proxy...");
  writeCaddyfile();
  reloadCaddy();

  log.header("Ready!");
  log.success(`https://${domain}`);
  for (const proc of processes) {
    log.dim(`  ${proc.role}: localhost:${proc.port} (PID ${proc.pid})`);
    log.dim(`  logs: ${proc.logFile}`);
  }
}
