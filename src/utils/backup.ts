import {
  cpSync,
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { AGENTS_HOME_DIR, BACKUPS_DIR, CLAUDE_DIR, CODEX_DIR, OPENCODE_DIR } from "../constants.js";
import { ensureDir } from "./config.js";
import { type Target, removePath } from "./targets.js";

/**
 * Config that `coff reset` may change. Never includes auth, history,
 * sessions, project memory, caches or sqlite state.
 */
const CLAUDE_ITEMS = [
  "settings.json",
  "CLAUDE.md",
  "skills",
  "agents",
  "rules",
  "commands",
  "hooks",
  "statusline.sh",
  "keybindings.json",
];
const CODEX_ITEMS = ["config.toml", "AGENTS.md", "hooks.json", "agents", "skills", "rules", "prompts"];
const OPENCODE_ITEMS = [
  "opencode.json",
  "opencode.jsonc",
  "tui.json",
  "AGENTS.md",
  "agents",
  "skills",
  "commands",
  "plugins",
  "modes",
];

/** Backed-up roots. Codex reads user skills from ~/.agents (shared with OpenCode). */
export type Scope = Target | "agents-home";

const roots: Record<Scope, string> = {
  claude: CLAUDE_DIR,
  codex: CODEX_DIR,
  opencode: OPENCODE_DIR,
  "agents-home": AGENTS_HOME_DIR,
};
const ITEMS: Record<Scope, string[]> = {
  claude: CLAUDE_ITEMS,
  codex: CODEX_ITEMS,
  opencode: OPENCODE_ITEMS,
  "agents-home": ["skills"],
};

export const scopesFor = (targets: Target[]): Scope[] => [
  ...targets,
  ...(targets.includes("codex") ? (["agents-home"] as const) : []),
];

function itemsFor(scope: Scope): string[] {
  const root = roots[scope];
  if (!existsSync(root)) return [];
  const items = [...ITEMS[scope]];
  if (scope === "codex") {
    // profiles (*.config.toml) and files referenced from AGENTS.md (e.g. RTK.md)
    for (const f of readdirSync(root)) {
      if ((f.endsWith(".config.toml") || f.endsWith(".md")) && !items.includes(f)) items.push(f);
    }
  }
  return items.filter((i) => {
    try {
      lstatSync(join(root, i));
      return true;
    } catch {
      return false;
    }
  });
}

/** Copy a file, dir or symlink as-is (symlinks stay symlinks). */
function copyVerbatim(src: string, dest: string): void {
  if (lstatSync(src).isSymbolicLink()) {
    let isDir = false;
    try {
      isDir = statSync(src).isDirectory();
    } catch {
      // broken link: keep it as a file link
    }
    symlinkSync(readlinkSync(src), dest, isDir ? (process.platform === "win32" ? "junction" : "dir") : "file");
    return;
  }
  cpSync(src, dest, { recursive: true, verbatimSymlinks: true });
}

export interface BackupManifest {
  createdAt: string;
  label: string;
  items: Partial<Record<Scope, string[]>>;
}

export interface BackupInfo {
  id: string;
  dir: string;
  manifest: BackupManifest;
}

export function createBackup(targets: Target[], label: string): BackupInfo {
  const createdAt = new Date().toISOString();
  const id = `${createdAt.replace(/[:.]/g, "-")}-${label}`;
  const dir = join(BACKUPS_DIR, id);
  const manifest: BackupManifest = { createdAt, label, items: {} };
  for (const scope of scopesFor(targets)) {
    const items = itemsFor(scope);
    ensureDir(join(dir, scope));
    for (const item of items) copyVerbatim(join(roots[scope], item), join(dir, scope, item));
    manifest.items[scope] = items;
  }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { id, dir, manifest };
}

export function listBackups(): BackupInfo[] {
  if (!existsSync(BACKUPS_DIR)) return [];
  return readdirSync(BACKUPS_DIR)
    .filter((id) => existsSync(join(BACKUPS_DIR, id, "manifest.json")))
    .sort()
    .reverse()
    .map((id) => ({
      id,
      dir: join(BACKUPS_DIR, id),
      manifest: JSON.parse(readFileSync(join(BACKUPS_DIR, id, "manifest.json"), "utf-8")),
    }));
}

/** Put every backed-up item back exactly as it was. */
export function restoreBackup(backup: BackupInfo): void {
  for (const [scope, items] of Object.entries(backup.manifest.items) as [Scope, string[]][]) {
    for (const item of items) {
      const dest = join(roots[scope], item);
      removePath(dest);
      ensureDir(roots[scope]);
      copyVerbatim(join(backup.dir, scope, item), dest);
    }
  }
}
