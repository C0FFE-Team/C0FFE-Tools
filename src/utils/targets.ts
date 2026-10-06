import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
  copyFileSync,
} from "fs";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  CLAUDE_DIR,
  CODEX_DIR,
  OPENCODE_DIR,
  MANAGED_MARKER,
  MANAGED_NAME,
  PREFIX,
} from "../constants.js";
import { ensureDir } from "./config.js";
import { log } from "./log.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// When bundled by tsup, cli.js is in dist/. Resources are at the project root.
export const RESOURCES_DIR = existsSync(resolve(__dirname, "resources"))
  ? resolve(__dirname, "resources")
  : resolve(__dirname, "..", "resources");

export const HOOK_SCRIPT = join(RESOURCES_DIR, "hooks", "context-reinject.mjs");

export const IS_WINDOWS = process.platform === "win32";

export const TARGETS = ["claude", "codex", "opencode"] as const;
export type Target = (typeof TARGETS)[number];

export const TARGET_LABEL: Record<Target, string> = {
  claude: "Claude Code",
  codex: "Codex",
  opencode: "OpenCode",
};

export function commandExists(cmd: string): boolean {
  try {
    if (IS_WINDOWS) execSync(`where ${cmd}`, { stdio: "ignore" });
    else execSync(`command -v ${cmd}`, { stdio: "ignore", shell: "/bin/sh" });
    return true;
  } catch {
    return false;
  }
}

const TARGET_HOME: Record<Target, string> = {
  claude: CLAUDE_DIR,
  codex: CODEX_DIR,
  opencode: OPENCODE_DIR,
};

export const isTargetPresent = (t: Target): boolean =>
  existsSync(TARGET_HOME[t]) || commandExists(t);

export function detectTargets(): Target[] {
  return TARGETS.filter(isTargetPresent);
}

// ---------- links ----------
// Directories are linked with symlinks (junctions on Windows: no admin needed).
// Files are symlinked too; where Windows refuses (no Developer Mode) they are
// copied with our marker, so they are still recognised and removed as ours.

/** Windows paths are case-insensitive and junction targets may carry a \\?\ prefix. */
const normalize = (p: string): string => {
  const r = resolve(p.replace(/^\\\\\?\\/, ""));
  return IS_WINDOWS ? r.toLowerCase() : r;
};

const linkTarget = (linkPath: string): string => resolve(dirname(linkPath), readlinkSync(linkPath));

export function isOurs(linkPath: string): boolean {
  try {
    if (!lstatSync(linkPath).isSymbolicLink()) return false;
    return normalize(linkTarget(linkPath)).startsWith(normalize(RESOURCES_DIR));
  } catch {
    return false;
  }
}

/** Remove a file, directory, symlink or junction; links are removed, never followed. */
export function removePath(path: string): void {
  try {
    if (lstatSync(path).isSymbolicLink()) return removeLink(path);
  } catch {
    return; // missing
  }
  rmSync(path, { recursive: true, force: true });
}

/** Remove a symlink or junction (a directory junction needs rmdir on some Windows setups). */
export function removeLink(linkPath: string): void {
  try {
    unlinkSync(linkPath);
  } catch {
    rmdirSync(linkPath);
  }
}

function createLink(src: string, dest: string): void {
  const isDir = statSync(src).isDirectory();
  try {
    symlinkSync(src, dest, isDir ? (IS_WINDOWS ? "junction" : "dir") : "file");
  } catch (err) {
    if (isDir || !IS_WINDOWS) throw err;
    writeFileSync(dest, withMarker(src));
  }
}

/** File content plus our marker (for copies made where symlinks are not allowed). */
function withMarker(src: string): string {
  const content = readFileSync(src, "utf-8");
  return src.endsWith(".md") ? `<!-- ${MANAGED_MARKER} -->\n${content}` : content;
}

/** Symlink `src` at `dest`. Replaces broken links and stale links of ours. */
export function linkOne(src: string, dest: string): void {
  ensureDir(dirname(dest));
  const name = basename(dest);
  let stat;
  try {
    stat = lstatSync(dest);
  } catch {
    stat = undefined;
  }

  if (stat) {
    if (stat.isFile() && isManagedFile(dest)) {
      unlinkSync(dest); // our copy from a previous install: refresh it
    } else if (!stat.isSymbolicLink()) {
      log.warn(`  Pulado ${name}: já existe e não é link (${dest})`);
      return;
    } else {
      const target = linkTarget(dest);
      if (normalize(target) === normalize(src)) {
        log.dim(`  ok ${name}`);
        return;
      }
      if (existsSync(target) && !isOurs(dest)) {
        log.warn(`  Pulado ${name}: link aponta para outro lugar (${target})`);
        return;
      }
      removeLink(dest);
    }
  }

  createLink(src, dest);
  log.success(`  ${name}`);
}

/** Symlink every entry of `srcDir` into `destDir`. */
export function linkEntries(srcDir: string, destDir: string): void {
  if (!existsSync(srcDir)) return;
  for (const entry of readdirSync(srcDir)) {
    linkOne(join(srcDir, entry), join(destDir, entry));
  }
}

/**
 * Remove generated files (carrying our marker) in `dir` whose path is not in `keep`.
 * Only coff-* names unless `anyName` (for directories that are entirely ours).
 */
export function removeManaged(dir: string, keep: Set<string> = new Set(), anyName = false): number {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (keep.has(full) || (!anyName && !f.startsWith(PREFIX))) continue;
    try {
      if (!lstatSync(full).isFile() || !isManagedFile(full)) continue;
    } catch {
      continue;
    }
    unlinkSync(full);
    n++;
  }
  return n;
}

/** Remove every symlink in `dir` that points into our resources (or is broken and named coff-*). */
export function unlinkOurs(dir: string): number {
  if (!existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let broken = false;
    try {
      broken = lstatSync(full).isSymbolicLink() && !existsSync(full);
    } catch {
      continue;
    }
    if (isOurs(full) || (broken && entry.startsWith(PREFIX))) {
      removeLink(full);
      removed++;
    }
  }
  return removed;
}

// ---------- backups ----------

/** Copy `file` to `file.c0ffe-tools.bak` once, before we first touch it. */
export function backupOnce(file: string): void {
  const bak = `${file}.${MANAGED_NAME}.bak`;
  if (existsSync(file) && !existsSync(bak)) copyFileSync(file, bak);
}

export function isManagedFile(file: string): boolean {
  try {
    return readFileSync(file, "utf-8").includes(MANAGED_MARKER);
  } catch {
    return false;
  }
}

// ---------- managed markdown block ----------

const BLOCK_BEGIN = `<!-- BEGIN ${MANAGED_NAME} (${MANAGED_MARKER}: rode \`coff install\` para atualizar) -->`;
const BLOCK_END = `<!-- END ${MANAGED_NAME} -->`;
const BLOCK_RE = new RegExp(
  `\\n*<!-- BEGIN ${MANAGED_NAME}[^\\n]*-->[\\s\\S]*?<!-- END ${MANAGED_NAME} -->\\n?`
);

export function upsertBlock(file: string, content: string, backup = true): void {
  const block = `${BLOCK_BEGIN}\n${content.trim()}\n${BLOCK_END}\n`;
  const current = existsSync(file) ? readFileSync(file, "utf-8") : "";
  if (backup) backupOnce(file);
  const next = BLOCK_RE.test(current)
    ? current.replace(BLOCK_RE, `\n\n${block}`)
    : `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${block}`;
  ensureDir(dirname(file));
  writeFileSync(file, next.replace(/^\n+/, ""));
}

export function removeBlock(file: string): boolean {
  if (!existsSync(file)) return false;
  const current = readFileSync(file, "utf-8");
  if (!BLOCK_RE.test(current)) return false;
  writeFileSync(file, current.replace(BLOCK_RE, "\n").trimEnd() + "\n");
  return true;
}

export function hasBlock(file: string): boolean {
  return existsSync(file) && BLOCK_RE.test(readFileSync(file, "utf-8"));
}

// ---------- hooks (same shape in Claude settings.json and Codex hooks.json) ----------

interface HookCommand {
  type: string;
  command: string;
  [k: string]: unknown;
}
interface HookGroup {
  matcher?: string;
  hooks: HookCommand[];
}
type HooksFile = { hooks?: Record<string, HookGroup[]>; [k: string]: unknown };

function readJson(file: string): HooksFile {
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf-8")) as HooksFile;
}

/** Ours by script name, so a hook from an older install (.sh) or another checkout path is replaced too. */
const isOurHook = (h: HookCommand): boolean =>
  typeof h.command === "string" && /context-reinject\.(sh|mjs)\b/.test(h.command);

/** Strip our hook from every event; returns whether anything changed. */
function stripOurHooks(data: HooksFile): boolean {
  let changed = false;
  for (const [event, groups] of Object.entries(data.hooks ?? {})) {
    const kept = groups
      .map((g) => ({ ...g, hooks: g.hooks.filter((h) => !isOurHook(h)) }))
      .filter((g) => g.hooks.length > 0);
    const before = groups.reduce((n, g) => n + g.hooks.length, 0);
    const after = kept.reduce((n, g) => n + g.hooks.length, 0);
    if (before !== after) changed = true;
    if (kept.length) data.hooks![event] = kept;
    else delete data.hooks![event];
  }
  return changed;
}

export function installHook(file: string, event: string): void {
  const data = readJson(file);
  stripOurHooks(data);
  data.hooks ??= {};
  data.hooks[event] ??= [];
  data.hooks[event].push({
    // forward slashes: Node accepts them on Windows, and hook shells (Git Bash) don't mangle them
    hooks: [{ type: "command", command: `node "${HOOK_SCRIPT.replaceAll("\\", "/")}"` }],
  });
  backupOnce(file);
  ensureDir(dirname(file));
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function removeHook(file: string): boolean {
  if (!existsSync(file)) return false;
  const data = readJson(file);
  if (!stripOurHooks(data)) return false;
  if (data.hooks && Object.keys(data.hooks).length === 0) delete data.hooks;
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  return true;
}

export function hasHook(file: string): boolean {
  if (!existsSync(file)) return false;
  try {
    const data = readJson(file);
    return Object.values(data.hooks ?? {}).some((groups) =>
      groups.some((g) => g.hooks.some(isOurHook))
    );
  } catch {
    return false;
  }
}
