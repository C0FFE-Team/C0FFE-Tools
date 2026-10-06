import { existsSync } from "fs";
import { CLAUDE_SETTINGS_PATH, CODEX_HOOKS_PATH, STATE_DIR } from "../constants.js";
import { loadRegistry } from "../utils/config.js";
import { log } from "../utils/log.js";
import { TARGET_LABEL, removeHook } from "../utils/targets.js";
import { uninstallLayer, uninstallProject } from "../utils/layers.js";
import { removeOpencodePlugin } from "../utils/opencode.js";
import { resolveTargets, type TargetOptions } from "./install.js";

export async function uninstallCommand(opts: TargetOptions = {}): Promise<void> {
  log.header("C0FFE Tools - Uninstall");
  const targets = resolveTargets(opts);

  for (const t of targets) {
    const n = uninstallLayer("global", t, "", targets);
    log.success(`${TARGET_LABEL[t]}: ${n} itens removidos`);
  }
  if (targets.includes("claude") && removeHook(CLAUDE_SETTINGS_PATH)) {
    log.success("Claude: hook removido do settings.json");
  }
  if (targets.includes("codex") && removeHook(CODEX_HOOKS_PATH)) {
    log.success("Codex: hook removido do hooks.json");
  }
  if (targets.includes("opencode") && removeOpencodePlugin()) {
    log.success("OpenCode: plugin de contexto removido");
  }

  for (const p of loadRegistry().clients.flatMap((c) => c.projects)) {
    if (!existsSync(p.path)) continue;
    const m = uninstallProject(p.path, targets);
    if (m) log.success(`${p.name}: ${m} itens removidos`);
  }

  log.dim(`\nRegistry e backups mantidos em ${STATE_DIR} (apague à mão se quiser).`);
}
