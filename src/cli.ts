import { Command } from "commander";
import { installCommand } from "./commands/install.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { doctorCommand } from "./commands/doctor.js";
import { addClientCommand } from "./commands/add-client.js";
import { addProjectCommand } from "./commands/add-project.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";
import { setupProxyCommand } from "./commands/setup-proxy.js";
import { upCommand } from "./commands/up.js";
import { downCommand } from "./commands/down.js";
import { psCommand } from "./commands/ps.js";
import { removeClientCommand } from "./commands/remove-client.js";
import { removeProjectCommand } from "./commands/remove-project.js";
import { resetCommand } from "./commands/reset.js";
import { profilesCommand } from "./commands/profiles.js";
import { restoreCommand } from "./commands/restore.js";

const program = new Command();

program
  .name("coff")
  .description("C0FFE Tools: AI development harness for Claude Code, Codex and OpenCode")
  .version("0.1.0");

program
  .command("install")
  .description(
    "Install the global layer (general skills/agents/rules + context hook) into each AI (Claude Code, Codex, OpenCode) and refresh the pipeline in registered projects. Auto-detects which are present."
  )
  .option("--claude", "Only Claude Code")
  .option("--codex", "Only Codex")
  .option("--opencode", "Only OpenCode")
  .option("--profile <name>", "Use a profile (e.g. free) and remember it; `default` goes back to the standard setup")
  .action(installCommand);

program
  .command("profiles")
  .description("List profiles (presets for a kind of user, e.g. free = OpenCode free plan, beginner)")
  .action(profilesCommand);

program
  .command("uninstall")
  .description("Remove everything c0ffe-tools installed (global + registered projects)")
  .option("--claude", "Only Claude Code")
  .option("--codex", "Only Codex")
  .option("--opencode", "Only OpenCode")
  .action(uninstallCommand);

program
  .command("reset")
  .description(
    "Back up the global Claude/Codex/OpenCode config, clear it (keeps MCPs, plugins, prefs and the skills you pick) and install the c0ffe-tools global layer"
  )
  .option("--claude", "Only Claude Code")
  .option("--codex", "Only Codex")
  .option("--opencode", "Only OpenCode")
  .option("-y, --yes", "No prompts: keep everything not shipped by c0ffe-tools")
  .option("--dry-run", "Show the plan without changing anything")
  .action(resetCommand);

program
  .command("restore")
  .description("Restore a global config backup from ~/.c0ffe-tools/backups (lists them if no id)")
  .argument("[id]", "Backup id (or prefix)")
  .option("-y, --yes", "Skip confirmation")
  .action(restoreCommand);

program
  .command("doctor")
  .description("Check install, MCPs, CLIs and tokens needed by the skills")
  .action(doctorCommand);

program
  .command("add-client")
  .description("Register a client in ~/.c0ffe-tools/registry.json")
  .argument("<name>", "Client name")
  .action(addClientCommand);

function figmaOption(
  val: string,
  acc: Record<string, string> = {}
): Record<string, string> {
  const idx = val.indexOf("=");
  if (idx === -1) {
    throw new Error(`--figma expects <repo>=<url>, got "${val}"`);
  }
  const repo = val.slice(0, idx).trim();
  const url = val.slice(idx + 1).trim();
  if (!repo || !url) {
    throw new Error(`--figma expects non-empty repo and url, got "${val}"`);
  }
  acc[repo] = url;
  return acc;
}

for (const [name, desc, pathArg] of [
  [
    "init",
    "Set up a project in one step (client is created if needed). Default: current dir.",
    "[path]",
  ],
  [
    "add-project",
    "Select client, set stack/PRD/Figma/tracker, inject .harness/ + the coff-* pipeline (.claude/, .agents/, .codex/) + AGENTS.md. Interactive unless flags provided.",
    "<path>",
  ],
] as const) {
  program
    .command(name)
    .description(desc)
    .argument(pathArg, "Path to project directory", pathArg === "[path]" ? "." : undefined)
    .option("--client <name>", "Client name or slug (created if missing)")
    .option("--prd <url>", "PRD Notion URL or local path")
    .option(
      "--figma <repo=url>",
      "Figma file URL per repo, e.g. --figma frontend=https://... (repeatable)",
      figmaOption,
      {} as Record<string, string>
    )
    .option("--tracker <key>", "Linear team key or Jira URL")
    .option("-y, --yes", "Accept detected repos without prompt")
    .action(addProjectCommand);
}

program
  .command("remove-client")
  .description("Remove a client and all its project references from the registry")
  .argument("<name>", "Client name")
  .action(removeClientCommand);

program
  .command("remove-project")
  .description("Remove a project reference from the registry (files on disk are kept)")
  .action(removeProjectCommand);

program
  .command("status")
  .description("Tree view of clients -> projects -> features with status")
  .option("--client <name>", "Filter by client name")
  .action(statusCommand);

program
  .command("sync")
  .description("Sync .harness/memory/features.md with Linear")
  .option("--project <name>", "Sync a specific project only")
  .action(syncCommand);

program
  .command("setup-proxy")
  .alias("setup-dns")
  .description(
    `One-time setup for dev servers: checks Caddy and trusts its local CA (HTTPS on *.coff.localhost, no DNS needed)`
  )
  .action(setupProxyCommand);

program
  .command("up")
  .description(
    "Start dev servers for a feature: allocate ports, spawn processes, configure reverse proxy"
  )
  .argument("<feature-slug>", "Feature slug (e.g. feat-login)")
  .action(upCommand);

program
  .command("down")
  .description("Stop dev servers for a feature and clean up")
  .argument("<feature-slug>", "Feature slug (e.g. feat-login)")
  .action(downCommand);

program
  .command("ps")
  .description("List running dev servers with status, domains, and ports")
  .action(psCommand);

program.action(() => {
  console.log(`
  coff — C0FFE Tools para Claude Code, Codex e OpenCode

  Primeira vez:
    coff install          camada global: rules gerais, skills utilitárias, agents genéricos, hook
    coff reset            (opcional) backup da config global atual + recomeça do zero
    coff doctor           confere MCPs, CLIs e tokens
    coff profiles         perfis (ex.: free = OpenCode no plano gratuito, iniciante)

  Em cada projeto:
    cd <projeto> && coff init     instala o pipeline coff-* no projeto

  Depois, dentro do agente:
    Claude Code:  /coff-styleguide   /coff-plan   /coff-solve <id>   /coff-do "<descrição>"
    Codex:        $coff-styleguide   $coff-plan   $coff-solve <id>   $coff-do "<descrição>"
    OpenCode:     /coff-styleguide   /coff-plan   /coff-solve <id>   /coff-do "<descrição>"

  Todos os comandos: coff --help
`);
});

program.parse();
