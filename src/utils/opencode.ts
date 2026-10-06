import { existsSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { MANAGED_MARKER, OPENCODE_PLUGINS_DIR, PREFIX } from "../constants.js";
import { ensureDir } from "./config.js";
import { HOOK_SCRIPT, isManagedFile } from "./targets.js";

/**
 * OpenCode has no shell hooks; a plugin does the same job as the SessionStart
 * hook of Claude/Codex, but better: it adds the .harness context to the
 * compaction itself (experimental.session.compacting), reusing the same script.
 */
export const OPENCODE_PLUGIN_PATH = join(OPENCODE_PLUGINS_DIR, `${PREFIX}context.js`);

function pluginSource(): string {
  return `// ${MANAGED_MARKER} — gerado por \`coff install\`. Não edite aqui.
import { execFileSync } from "node:child_process";

const SCRIPT = ${JSON.stringify(HOOK_SCRIPT)};

export const CoffContext = async ({ directory }) => ({
  "experimental.session.compacting": async (_input, output) => {
    let out = "";
    try {
      out = execFileSync("bash", [SCRIPT], {
        input: JSON.stringify({ source: "compact", cwd: directory }),
        encoding: "utf-8",
        timeout: 10000,
      });
    } catch {
      return;
    }
    let context = out;
    try {
      context = JSON.parse(out)?.hookSpecificOutput?.additionalContext ?? out;
    } catch {
      // script printed plain text (no node available to it)
    }
    if (context.trim()) output.context.push(context);
  },
});
`;
}

export function installOpencodePlugin(): void {
  ensureDir(OPENCODE_PLUGINS_DIR);
  writeFileSync(OPENCODE_PLUGIN_PATH, pluginSource());
}

export function removeOpencodePlugin(): boolean {
  if (!existsSync(OPENCODE_PLUGIN_PATH) || !isManagedFile(OPENCODE_PLUGIN_PATH)) return false;
  unlinkSync(OPENCODE_PLUGIN_PATH);
  return true;
}

export const hasOpencodePlugin = (): boolean =>
  existsSync(OPENCODE_PLUGIN_PATH) && isManagedFile(OPENCODE_PLUGIN_PATH);
