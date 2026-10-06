import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import inquirer from "inquirer";
import {
  CLAUDE_DIR,
  CLAUDE_SETTINGS_PATH,
  CODEX_DIR,
  CODEX_AGENTS_MD,
  CODEX_HOOKS_PATH,
  CODEX_LEGACY_SKILLS_DIR,
  CODEX_SKILLS_DIR,
  OPENCODE_DIR,
  OPENCODE_AGENTS_MD,
  MANAGED_NAME,
  PREFIX,
} from "../constants.js";
import { log } from "../utils/log.js";
import { RESOURCES_DIR, TARGETS, type Target, isManagedFile, isOurs } from "../utils/targets.js";
import { createBackup } from "../utils/backup.js";
import { installGlobal, resolveTargets, type TargetOptions } from "./install.js";

interface ResetOptions extends TargetOptions {
  yes?: boolean;
  dryRun?: boolean;
}

/** User dirs whose entries the user picks to keep; everything else in them is removed. */
const PICK_DIRS: Record<Target, string[]> = {
  claude: [
    join(CLAUDE_DIR, "skills"),
    join(CLAUDE_DIR, "agents"),
    join(CLAUDE_DIR, "rules"),
    join(CLAUDE_DIR, "commands"),
  ],
  codex: [CODEX_SKILLS_DIR, CODEX_LEGACY_SKILLS_DIR, join(CODEX_DIR, "agents")],
  opencode: [
    join(OPENCODE_DIR, "skills"),
    join(OPENCODE_DIR, "agents"),
    join(OPENCODE_DIR, "commands"),
    join(OPENCODE_DIR, "plugins"),
  ],
};

/** Names shipped by c0ffe-tools (without prefix): old copies of these are leftovers. */
function shippedNames(): Set<string> {
  const names = new Set<string>();
  for (const base of ["shared", ...TARGETS]) {
    for (const layer of ["global", "project"]) {
      for (const kind of ["skills", "agents", "rules"]) {
        const dir = join(RESOURCES_DIR, base, layer, kind);
        if (!existsSync(dir)) continue;
        for (const f of readdirSync(dir)) if (!f.startsWith(".")) names.add(baseName(f));
      }
    }
  }
  return names;
}

/** "prod:create-pr" / "coff-scout.md" / "tester.toml" → "create-pr" / "scout" / "tester" */
const baseName = (entry: string): string =>
  entry.replace(/\.(md|toml|js|ts)$/, "").replace(/^[^:]+:/, "").replace(new RegExp(`^${PREFIX}`), "");

function isManagedEntry(full: string, entry: string): boolean {
  return isOurs(full) || entry === MANAGED_NAME || (entry.startsWith(PREFIX) && isManagedFile(full));
}

interface Pick {
  target: Target;
  dir: string;
  remove: string[];
}

async function pickEntries(targets: Target[], yes: boolean): Promise<Pick[]> {
  const shipped = shippedNames();
  const picks: Pick[] = [];
  for (const target of targets) {
    for (const dir of PICK_DIRS[target]) {
      if (!existsSync(dir)) continue;
      const entries = readdirSync(dir).filter(
        (e) => !e.startsWith(".") && !isManagedEntry(join(dir, e), e)
      );
      if (entries.length === 0) continue;
      const choices = entries.map((e) => ({ name: e, value: e, checked: !shipped.has(baseName(e)) }));
      let keep: string[];
      if (yes) {
        keep = choices.filter((c) => c.checked).map((c) => c.value);
      } else {
        ({ keep } = await inquirer.prompt([
          {
            type: "checkbox",
            name: "keep",
            message: `Manter em ${dir.replace(homedir(), "~")}? (desmarcados vão só pro backup)`,
            choices,
            pageSize: 20,
          },
        ]));
      }
      picks.push({ target, dir, remove: entries.filter((e) => !keep.includes(e)) });
    }
  }
  return picks;
}

type Permissions = Record<string, string[]>;

const readBasePermissions = (): Permissions =>
  JSON.parse(readFileSync(join(RESOURCES_DIR, "claude", "permissions.json"), "utf-8"));

/** Keep prefs, plugins, statusline, env…; reset permission grants and hooks. */
function resetClaudeSettings(base: Permissions): void {
  const data = existsSync(CLAUDE_SETTINGS_PATH)
    ? JSON.parse(readFileSync(CLAUDE_SETTINGS_PATH, "utf-8"))
    : {};
  const { allow, deny } = base;
  data.permissions = { ...(data.permissions ?? {}), allow, deny, ask: [] };
  delete data.hooks;
  writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(data, null, 2) + "\n");
}

/** opencode.json (providers, MCPs, prefs) is left untouched. */
function resetOpencode(): void {
  rmSync(OPENCODE_AGENTS_MD, { force: true });
}

/** config.toml (MCPs, plugins, prefs, trusted projects) is left untouched. */
function resetCodex(): void {
  // removed, not emptied: install recreates them (and skips the .bak of an empty file)
  rmSync(CODEX_AGENTS_MD, { force: true });
  rmSync(CODEX_HOOKS_PATH, { force: true });
  // exec-policy approvals: Codex's equivalent of Claude's permission grants
  rmSync(join(CODEX_DIR, "rules"), { recursive: true, force: true });
}

export async function resetCommand(opts: ResetOptions = {}): Promise<void> {
  log.header("C0FFE Tools - Reset global");
  const targets = resolveTargets(opts);
  if (targets.length === 0) {
    log.error("Nenhuma IA encontrada (Claude Code, Codex, OpenCode).");
    process.exit(1);
  }

  log.info("Mantidos: MCP servers, plugins/marketplaces, model/theme/statusline, profiles, auth, histórico, sessões, memória.");
  // read inputs up front: a failure must not happen after files were removed
  const basePermissions = targets.includes("claude") ? readBasePermissions() : {};
  const picks = await pickEntries(targets, opts.yes === true);

  log.header("Plano");
  if (targets.includes("claude")) {
    log.info("~/.claude/settings.json → permissões base, hooks só do c0ffe-tools (resto mantido)");
  }
  if (targets.includes("codex")) {
    log.info("~/.codex/AGENTS.md → só o bloco c0ffe-tools");
    log.info("~/.codex/hooks.json → só o hook do c0ffe-tools");
    log.info("~/.codex/rules/ (aprovações de comandos) → zerado");
  }
  if (targets.includes("opencode")) {
    log.info("~/.config/opencode/AGENTS.md → só o bloco c0ffe-tools (opencode.json mantido)");
  }
  for (const p of picks.filter((p) => p.remove.length)) {
    log.info(`${p.dir.replace(homedir(), "~")} → remover: ${p.remove.join(", ")}`);
  }
  log.info("Depois: instala a camada global do c0ffe-tools (rules gerais, skills utilitárias, agents genéricos).");

  if (opts.dryRun) {
    log.dim("\n--dry-run: nada foi alterado.");
    return;
  }
  if (!opts.yes) {
    const { ok } = await inquirer.prompt([
      { type: "confirm", name: "ok", message: "Fazer backup e aplicar?", default: false },
    ]);
    if (!ok) return;
  }

  const backup = createBackup(targets, "reset");
  log.success(`Backup em ${backup.dir}`);

  for (const p of picks) {
    for (const e of p.remove) rmSync(join(p.dir, e), { recursive: true, force: true });
  }
  if (targets.includes("claude")) resetClaudeSettings(basePermissions);
  if (targets.includes("codex")) resetCodex();
  if (targets.includes("opencode")) resetOpencode();

  installGlobal(targets);

  log.header("Pronto!");
  log.info(`Desfazer: coff restore ${backup.id}`);
}
