import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { dirname, join, basename } from "path";
import { STATE_DIR, REGISTRY_PATH } from "../constants.js";
import type { Registry, HarnessConfig, RepoConfig } from "../types.js";
import { HARNESS_DIR, HARNESS_CONFIG } from "../constants.js";

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadRegistry(): Registry {
  ensureDir(STATE_DIR);
  if (!existsSync(REGISTRY_PATH)) {
    const empty: Registry = { clients: [] };
    saveRegistry(empty);
    return empty;
  }
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

export function saveRegistry(registry: Registry): void {
  ensureDir(dirname(REGISTRY_PATH));
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n");
}

export function loadHarnessConfig(projectPath: string): HarnessConfig | null {
  const configPath = join(projectPath, HARNESS_DIR, HARNESS_CONFIG);
  if (!existsSync(configPath)) return null;
  const raw = JSON.parse(readFileSync(configPath, "utf-8"));
  const migrated = migrateHarnessConfig(raw);
  if (migrated.changed) {
    writeFileSync(configPath, JSON.stringify(migrated.config, null, 2) + "\n");
  }
  return migrated.config;
}

interface MigrationResult {
  config: HarnessConfig;
  changed: boolean;
}

export function migrateHarnessConfig(raw: unknown): MigrationResult {
  const cfg = raw as Omit<HarnessConfig, "version"> & { version: number };
  let changed = false;

  if (cfg.version === 2) {
    const legacyFigma =
      typeof cfg.figma_file === "string" && cfg.figma_file.length > 0
        ? cfg.figma_file
        : undefined;

    const uiRepos = (cfg.repos ?? []).filter(isUIRepo);

    if (legacyFigma && uiRepos.length === 1 && !uiRepos[0].figma_file) {
      uiRepos[0].figma_file = legacyFigma;
      delete cfg.figma_file;
    }

    cfg.version = 3;
    changed = true;
  }

  if (cfg.figma_file === "") {
    delete cfg.figma_file;
    changed = true;
  }

  return { config: cfg as HarnessConfig, changed };
}

export function saveHarnessConfig(
  projectPath: string,
  config: HarnessConfig
): void {
  const configDir = join(projectPath, HARNESS_DIR);
  ensureDir(configDir);
  writeFileSync(
    join(configDir, HARNESS_CONFIG),
    JSON.stringify(config, null, 2) + "\n"
  );
}

export const UI_ROLES = new Set([
  "frontend",
  "mobile",
  "site",
  "web",
  "desktop",
  "pwa",
]);

export function isUIRepo(repo: RepoConfig): boolean {
  return UI_ROLES.has(repo.role.toLowerCase());
}

export function resolveFigma(
  cfg: HarnessConfig,
  repoName?: string
): string | undefined {
  if (repoName) {
    const repo = cfg.repos.find((r) => r.name === repoName);
    if (repo?.figma_file) return repo.figma_file;
  }
  return cfg.figma_file;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function detectRepos(projectPath: string): RepoConfig[] {
  const repos: RepoConfig[] = [];

  const entries = readdirSync(projectPath);
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = join(projectPath, entry);
    try {
      if (!statSync(fullPath).isDirectory()) continue;
    } catch {
      continue;
    }

    if (!existsSync(join(fullPath, ".git"))) continue;

    const repo = detectRepoStack(entry, fullPath);
    repos.push(repo);
  }

  // If no sub-repos found, check if root itself is a git repo
  if (repos.length === 0 && existsSync(join(projectPath, ".git"))) {
    const repo = detectRepoStack(".", projectPath);
    repo.path = ".";
    repos.push(repo);
  }

  return repos;
}

function detectRepoStack(name: string, repoPath: string): RepoConfig {
  const repo: RepoConfig = {
    name,
    path: `./${name}`,
    role: "other",
    stack: "other",
  };

  // Check for wrangler.toml first (no package.json needed)
  if (existsSync(join(repoPath, "wrangler.toml"))) {
    repo.stack = "cloudflare-workers";
    repo.role = "worker";
    return repo;
  }

  const pkgPath = join(repoPath, "package.json");
  if (!existsSync(pkgPath)) return repo;

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return repo;
  }

  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };

  if (deps["expo"] || deps["react-native"]) {
    repo.stack = "react-native";
    repo.role = "mobile";
  } else if (deps["@nestjs/core"]) {
    repo.stack = "nestjs";
    repo.role = "backend";
  } else if (deps["next"]) {
    repo.stack = "next";
    repo.role =
      /site|landing|marketing/i.test(name) ? "site" : "frontend";
  } else if (deps["react"]) {
    repo.stack = "react";
    repo.role = "frontend";
  }

  return repo;
}
