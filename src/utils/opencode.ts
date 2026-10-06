import { existsSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { MANAGED_MARKER, OPENCODE_PLUGINS_DIR, PREFIX } from "../constants.js";
import { ensureDir } from "./config.js";
import { HOOK_SCRIPT, isManagedFile } from "./targets.js";

/**
 * OpenCode has no shell hooks; a plugin does the same job as the SessionStart
 * hook of Claude/Codex, but better: it adds the .harness context to the
 * compaction itself (experimental.session.compacting). It imports the same
 * Node script the hooks run, so behaviour is identical on every OS.
 */
export const OPENCODE_PLUGIN_PATH = join(OPENCODE_PLUGINS_DIR, `${PREFIX}context.js`);

function pluginSource(): string {
  return `// ${MANAGED_MARKER} — gerado por \`coff install\`. Não edite aqui.
import { buildContext } from ${JSON.stringify(pathToFileURL(HOOK_SCRIPT).href)};

export const CoffContext = async ({ directory }) => ({
  "experimental.session.compacting": async (_input, output) => {
    try {
      const context = buildContext(directory);
      if (context) output.context.push(context);
    } catch {
      // never break compaction because of the harness
    }
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
