import { resolve, basename, join } from "path";
import { existsSync, writeFileSync, readdirSync, statSync } from "fs";
import inquirer from "inquirer";
import {
  loadRegistry,
  saveRegistry,
  ensureDir,
  saveHarnessConfig,
  detectRepos,
  isUIRepo,
  slugify,
} from "../utils/config.js";
import { HARNESS_DIR, HARNESS_MEMORY_DIR, HARNESS_PLANS_DIR, HARNESS_ASSETS_DIR } from "../constants.js";
import { log } from "../utils/log.js";
import { resolveTargets } from "./install.js";
import { TARGET_LABEL } from "../utils/targets.js";
import { useActiveProfile } from "../utils/profile.js";
import { installProject } from "../utils/layers.js";
import type { HarnessConfig, Registry, RepoConfig } from "../types.js";

interface AddProjectOptions {
  client?: string;
  prd?: string;
  figma?: Record<string, string>;
  tracker?: string;
  yes?: boolean;
}

export async function addProjectCommand(
  pathArg: string,
  opts: AddProjectOptions = {}
): Promise<void> {
  const projectPath = resolve(pathArg);
  const projectName = basename(projectPath);
  await useActiveProfile();

  if (!existsSync(projectPath)) {
    log.error(`Directory does not exist: ${projectPath}`);
    process.exit(1);
  }

  const registry = loadRegistry();

  const already = registry.clients.find((c) =>
    c.projects.some((p) => p.path === projectPath)
  );
  if (already) {
    log.warn(`Projeto já registrado em ${projectPath} (cliente "${already.name}"). Atualizando o pipeline.`);
    installProject(projectPath, resolveTargets({}));
    return;
  }

  const clientSlug = await resolveClient(registry, projectName, opts);
  // Auto-detect repositories
  const detectedRepos = detectRepos(projectPath);

  if (detectedRepos.length > 0) {
    log.info("\nDetected repositories:");
    for (const repo of detectedRepos) {
      log.success(`  ${repo.name}/\t[${repo.stack}, ${repo.role}]`);
    }

    // Show skipped directories (non-git subdirs)
    const allDirs = readdirSync(projectPath).filter((entry) => {
      if (entry.startsWith(".")) return false;
      const fullPath = join(projectPath, entry);
      try {
        return statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });
    const repoNames = detectedRepos.map((r) => r.name);
    const skipped = allDirs.filter((d) => !repoNames.includes(d));
    if (skipped.length > 0) {
      log.dim(`\n  Skipped (no .git): ${skipped.join(", ")}`);
    }
  } else {
    log.warn("No git repositories detected in subdirectories or root.");
  }

  let confirmRepos: boolean;
  if (opts.yes) {
    confirmRepos = true;
  } else {
    ({ confirmRepos } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmRepos",
        message: "Confirm detected repositories?",
        default: true,
      },
    ]));
  }

  let repos: RepoConfig[] = detectedRepos;
  if (!confirmRepos) {
    log.info("Skipping — you can manually edit .harness/config.json later.");
    repos = [];
  }

  const figmaFlag = opts.figma ?? {};
  const hasFigmaFlag = Object.keys(figmaFlag).length > 0;

  const nonInteractive =
    opts.client !== undefined ||
    opts.prd !== undefined ||
    hasFigmaFlag ||
    opts.tracker !== undefined ||
    opts.yes === true;

  let prd: string;
  let tracker_team: string;
  if (nonInteractive) {
    prd = opts.prd ?? "";
    tracker_team = opts.tracker ?? "";
  } else {
    ({ prd, tracker_team } = await inquirer.prompt([
      {
        type: "input",
        name: "prd",
        message: "PRD source — Notion URL or local file path (or leave blank):",
      },
      {
        type: "input",
        name: "tracker_team",
        message:
          "Tracker — Linear team key (e.g. TEAM) or Jira URL (e.g. https://company.atlassian.net):",
      },
    ]));
  }

  const uiRepos = repos.filter(isUIRepo);

  if (nonInteractive) {
    for (const repo of uiRepos) {
      const url = figmaFlag[repo.name];
      if (url) repo.figma_file = url;
    }
  } else if (uiRepos.length > 0) {
    log.info("\nFigma por repo (UI):");
    for (const repo of uiRepos) {
      const { url } = await inquirer.prompt([
        {
          type: "input",
          name: "url",
          message: `Figma para ${repo.name} (${repo.role}/${repo.stack}) — em branco para pular:`,
        },
      ]);
      if (url) repo.figma_file = url;
    }
  }

  const client = registry.clients.find((c) => c.slug === clientSlug)!;

  // Create .harness/ structure
  const harnessDir = join(projectPath, HARNESS_DIR);
  ensureDir(join(harnessDir, HARNESS_MEMORY_DIR));
  ensureDir(join(harnessDir, HARNESS_PLANS_DIR));
  ensureDir(join(harnessDir, HARNESS_ASSETS_DIR));

  const config: HarnessConfig = {
    version: 3,
    client: client.name,
    repos,
    prd: prd || "",
    tracker_team: tracker_team || "",
    tracker_project: "",
  };
  saveHarnessConfig(projectPath, config);

  // Create initial features.md
  writeFileSync(
    join(harnessDir, HARNESS_MEMORY_DIR, "features.md"),
    `# Feature Status\n\n## Implementation Order (by dependency)\n\n## Implemented\n\n## In Progress\n\n## Pending\n`
  );

  // Create initial decisions.md
  writeFileSync(
    join(harnessDir, HARNESS_MEMORY_DIR, "decisions.md"),
    `# Key Decisions\n\n`
  );

  const targets = resolveTargets({});
  const forClaude = targets.includes("claude");

  // Claude Code project settings with common permissions
  const claudeDir = join(projectPath, ".claude");
  const settingsPath = join(claudeDir, "settings.local.json");
  if (forClaude && !existsSync(settingsPath)) {
    ensureDir(claudeDir);
    writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          permissions: {
            allow: [
              "Read",
              "Glob",
              "Grep",
              "Bash(git *)",
              "Bash(npm run *)",
              "Bash(npx *)",
              "Bash(pnpm *)",
              "Bash(bun *)",
            ],
            deny: [],
          },
        },
        null,
        2
      ) + "\n"
    );
  }

  // Generate project CLAUDE.md
  const claudeMdPath = join(projectPath, "CLAUDE.md");
  if (forClaude && !existsSync(claudeMdPath)) {
    writeFileSync(
      claudeMdPath,
      generateClaudeMd(client.name, projectName, config)
    );
  }

  // Same context for Codex and OpenCode, which read AGENTS.md instead of CLAUDE.md
  const agentsMdPath = join(projectPath, "AGENTS.md");
  if (!existsSync(agentsMdPath)) {
    writeFileSync(
      agentsMdPath,
      generateClaudeMd(client.name, projectName, config, "codex")
    );
  }

  // Pipeline skills/agents/rules live in the project, not in ~/.claude / ~/.codex
  log.info("\nPipeline coff-* no projeto:");
  installProject(projectPath, targets);

  // Register in registry
  client.projects.push({ name: projectName, path: projectPath });
  saveRegistry(registry);

  log.success(`Project "${projectName}" added to client "${client.name}".`);
  log.info(`  .harness/ created at ${harnessDir}`);
  log.info(`  ${forClaude ? "CLAUDE.md e AGENTS.md gerados" : "AGENTS.md gerado"} (se ainda não existiam).`);
  log.info(`  Pipeline coff-* instalado para: ${targets.map((t) => TARGET_LABEL[t]).join(", ")}.`);
  log.info("  Abra a IA na pasta do projeto: /coff-styleguide (Claude, OpenCode) ou $coff-styleguide (Codex).");
}

async function resolveClient(
  registry: Registry,
  projectName: string,
  opts: AddProjectOptions
): Promise<string> {
  const create = (name: string): string => {
    const slug = slugify(name);
    if (!registry.clients.some((c) => c.slug === slug)) {
      registry.clients.push({ name, slug, projects: [] });
      log.success(`Cliente "${name}" criado (slug: ${slug}).`);
    }
    return slug;
  };

  if (opts.client) {
    const found = registry.clients.find(
      (c) => c.slug === opts.client || c.slug === slugify(opts.client!)
    );
    return found ? found.slug : create(opts.client);
  }

  if (opts.yes) return create(projectName);

  const NEW = "__new__";
  let choice = NEW;
  if (registry.clients.length > 0) {
    ({ choice } = await inquirer.prompt([
      {
        type: "list",
        name: "choice",
        message: "Cliente:",
        choices: [
          ...registry.clients.map((c) => ({ name: c.name, value: c.slug })),
          { name: "+ Novo cliente", value: NEW },
        ],
      },
    ]));
  }
  if (choice !== NEW) return choice;

  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Nome do cliente:",
      default: projectName,
    },
  ]);
  return create(name);
}

function generateClaudeMd(
  clientName: string,
  projectName: string,
  config: HarnessConfig,
  agent: "claude" | "codex" = "claude"
): string {
  // Claude invokes skills as /name; AGENTS.md is read by Codex ($name) and OpenCode (/name)
  const s = agent === "claude" ? "/" : "$";
  const reposSection =
    config.repos.length > 0
      ? config.repos
          .map((r) => {
            const figma = r.figma_file ? ` — Figma: ${r.figma_file}` : "";
            return `  - \`${r.path}\` — **${r.stack}** (${r.role})${figma}`;
          })
          .join("\n")
      : "  - (none detected)";

  return `# ${projectName}

## Project Context
- **Client:** ${clientName}
- **Repos:**
${reposSection}
${config.prd ? `- **PRD:** ${config.prd}` : ""}
${config.tracker_team ? `- **Tracker:** ${config.tracker_team}` : ""}

## Multi-Repo Structure
This is a multi-repo project. Each subdirectory with a \`.git/\` folder is an independent repository.
- Use \`git -C <repo-path>\` for git operations targeting a specific repo.
- Use the same branch name across all repos for a given feature.
- Each repo has its own \`package.json\`, \`tsconfig.json\`, and build/test scripts.

## Harness
This project uses C0FFE Tools. Feature context lives in \`.harness/\`.

### Available Skills
${agent === "codex" ? "In OpenCode use \`/coff-*\` instead of \`$coff-*\`.\n" : ""}- \`${s}coff-styleguide\` - Extract style guide from Figma (run first!)
- \`${s}coff-plan\` - Analyze PRD + Figma, find gaps, create tracker features
- \`${s}coff-solve <feature-id>\` - Full feature pipeline (Scout > Architect > Engineer > Tester > Publisher)
- \`${s}coff-do "<description>"\` - Same pipeline from a plain description (no ticket)
- \`${s}coff-implement <figma-url>\` - Pixel-perfect Figma to code
- \`${s}coff-linear <parent-issue>\` - Resolve all sub-issues of a Linear issue against Figma
- \`${s}coff-deploy\` - Deploy backend (Railway) + frontend (Vercel)
- \`${s}coff-research <topic>\` - Research libraries/frameworks

### Feature Workflow
1. Run \`${s}coff-styleguide\` to extract design tokens (required prerequisite)
2. Run \`${s}coff-plan\` to break PRD + Figma into features
3. Run \`${s}coff-solve <id>\` for each feature in dependency order

### Rules
- Always check existing components before creating new ones
- Use style guide tokens, never hardcode colors/spacing
- Every feature gets a plan in \`.harness/plans/<feature-slug>/\`
- Commit after each atomic change
`;
}
