import { existsSync } from "fs";
import { STATE_DIR, CLAUDE_SETTINGS_PATH, CODEX_HOOKS_PATH } from "../constants.js";
import { ensureDir, loadRegistry } from "../utils/config.js";
import { log } from "../utils/log.js";
import { TARGETS, TARGET_LABEL, type Target, detectTargets, installHook } from "../utils/targets.js";
import { installLayer, installProject } from "../utils/layers.js";
import { OPENCODE_PLUGIN_PATH, installOpencodePlugin } from "../utils/opencode.js";

export type TargetOptions = Partial<Record<Target, boolean>>;

/** Explicit flags win; otherwise every AI CLI found on this machine. */
export function resolveTargets(opts: TargetOptions): Target[] {
  const picked = TARGETS.filter((t) => opts[t]);
  return picked.length ? picked : detectTargets();
}

/** Warn about setups where one AI would see another's files twice. */
export function warnOverlaps(targets: Target[]): void {
  if (
    targets.includes("opencode") &&
    targets.includes("claude") &&
    !process.env.OPENCODE_DISABLE_CLAUDE_CODE &&
    !process.env.OPENCODE_DISABLE_CLAUDE_CODE_SKILLS
  ) {
    log.warn(
      process.platform === "win32"
        ? "OpenCode também lê .claude/skills e veria as skills coff-* duplicadas. Rode uma vez no PowerShell: setx OPENCODE_DISABLE_CLAUDE_CODE_SKILLS 1"
        : "OpenCode também lê .claude/skills e veria as skills coff-* duplicadas. Adicione ao ~/.zshrc ou ~/.bashrc: export OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1"
    );
  }
}

/** Context hook: SessionStart for Claude/Codex, compaction plugin for OpenCode. No-op outside projects with .harness/. */
function installHooks(targets: Target[]): void {
  log.info("Hook de contexto (re-injeta o .harness após compact)");
  if (targets.includes("claude")) {
    installHook(CLAUDE_SETTINGS_PATH, "SessionStart");
    log.success(`  ${CLAUDE_SETTINGS_PATH}`);
  }
  if (targets.includes("codex")) {
    installHook(CODEX_HOOKS_PATH, "SessionStart");
    log.success(`  ${CODEX_HOOKS_PATH}`);
    log.dim("  O Codex pede para confiar no hook novo na próxima sessão — aprove.");
  }
  if (targets.includes("opencode")) {
    installOpencodePlugin();
    log.success(`  ${OPENCODE_PLUGIN_PATH}`);
  }
}

export function installGlobal(targets: Target[]): void {
  for (const t of targets) {
    log.header(`${TARGET_LABEL[t]} (global)`);
    installLayer("global", t, targets);
  }
  log.header("Hooks");
  installHooks(targets);
}

/** Re-install the pipeline into every registered project that still exists. */
export function refreshProjects(targets: Target[]): void {
  const projects = loadRegistry().clients.flatMap((c) => c.projects);
  if (projects.length === 0) return;
  log.header("Projetos registrados");
  for (const p of projects) {
    if (!existsSync(p.path)) {
      log.warn(`Pulado ${p.name}: ${p.path} não existe (coff remove-project)`);
      continue;
    }
    log.info(p.path);
    installProject(p.path, targets);
  }
}

export async function installCommand(opts: TargetOptions = {}): Promise<void> {
  log.header("C0FFE Tools - Install");

  ensureDir(STATE_DIR);
  log.success(`Estado em ${STATE_DIR}`);

  const targets = resolveTargets(opts);
  if (targets.length === 0) {
    log.error("Nenhuma IA encontrada (Claude Code, Codex, OpenCode). Instale uma ou passe --claude / --codex / --opencode.");
    process.exit(1);
  }
  log.info(`IAs: ${targets.map((t) => TARGET_LABEL[t]).join(", ")}`);

  installGlobal(targets);
  refreshProjects(targets);

  log.header("Pronto!");
  warnOverlaps(targets);
  log.info("Próximos passos:");
  log.dim("  coff doctor          # confere MCPs, CLIs e tokens");
  log.dim("  cd <projeto> && coff init   # instala o pipeline coff-* no projeto");
  log.dim("  coff reset           # (opcional) faz backup da config global e recomeça do zero");
  log.dim("  Skills são symlinks (editar vale na hora). Agents, rules do Codex/OpenCode e commands são gerados: rode `coff install` após mudá-los.");
}
