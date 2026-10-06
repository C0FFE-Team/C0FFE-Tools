import { existsSync, lstatSync, readFileSync, readdirSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import {
  CLAUDE_SKILLS_DIR,
  CLAUDE_AGENTS_DIR,
  CLAUDE_RULES_DIR,
  CODEX_SKILLS_DIR,
  CODEX_LEGACY_SKILLS_DIR,
  CODEX_AGENTS_DIR,
  CODEX_AGENTS_MD,
  OPENCODE_SKILLS_DIR,
  OPENCODE_AGENTS_DIR,
  OPENCODE_COMMANDS_DIR,
  OPENCODE_AGENTS_MD,
  MANAGED_NAME,
  PREFIX,
  PROJECT_CLAUDE_DIR,
  PROJECT_CODEX_SKILLS_DIR,
  PROJECT_CODEX_AGENTS_DIR,
  PROJECT_OPENCODE_DIR,
} from "../constants.js";
import { ensureDir } from "./config.js";
import { log } from "./log.js";
import {
  RESOURCES_DIR,
  TARGET_LABEL,
  type Target,
  hasBlock,
  isManagedFile,
  isTargetPresent,
  linkOne,
  removeBlock,
  removeManaged,
  unlinkOurs,
  upsertBlock,
} from "./targets.js";
import { type Layer, divergent, frontmatterField, resolveEntries } from "./resources.js";
import { opencodeSkillCommand, parseAgent, renderAgent } from "./agents.js";

export type { Layer } from "./resources.js";

/** Where one AI keeps one layer. Rules go to a directory (Claude) or a managed block (AGENTS.md). */
export interface Dest {
  skills: string;
  agents: string;
  rules: { dir: string } | { block: string };
  commands?: string;
}

export function dest(layer: Layer, target: Target, projectPath = ""): Dest {
  const p = (...parts: string[]) => join(projectPath, ...parts);
  if (layer === "global") {
    switch (target) {
      case "claude":
        return { skills: CLAUDE_SKILLS_DIR, agents: CLAUDE_AGENTS_DIR, rules: { dir: join(CLAUDE_RULES_DIR, MANAGED_NAME) } };
      case "codex":
        return { skills: CODEX_SKILLS_DIR, agents: CODEX_AGENTS_DIR, rules: { block: CODEX_AGENTS_MD } };
      case "opencode":
        return {
          skills: OPENCODE_SKILLS_DIR,
          agents: OPENCODE_AGENTS_DIR,
          rules: { block: OPENCODE_AGENTS_MD },
          commands: OPENCODE_COMMANDS_DIR,
        };
    }
  }
  switch (target) {
    case "claude":
      return {
        skills: p(PROJECT_CLAUDE_DIR, "skills"),
        agents: p(PROJECT_CLAUDE_DIR, "agents"),
        rules: { dir: p(PROJECT_CLAUDE_DIR, "rules", MANAGED_NAME) },
      };
    case "codex":
      return { skills: p(PROJECT_CODEX_SKILLS_DIR), agents: p(PROJECT_CODEX_AGENTS_DIR), rules: { block: p("AGENTS.md") } };
    case "opencode":
      return {
        skills: p(PROJECT_OPENCODE_DIR, "skills"),
        agents: p(PROJECT_OPENCODE_DIR, "agents"),
        rules: { block: p("AGENTS.md") },
        commands: p(PROJECT_OPENCODE_DIR, "commands"),
      };
  }
}

/**
 * OpenCode also reads `.agents/skills` (Codex) and requires unique skill names,
 * so with Codex installed it uses Codex's skills instead of a copy of its own.
 * Codex and OpenCode also share the project AGENTS.md.
 */
const sharesCodexSkills = (target: Target, targets: Target[]): boolean =>
  target === "opencode" && targets.includes("codex");
const sharesCodexBlock = (layer: Layer, target: Target, targets: Target[]): boolean =>
  layer === "project" && target === "opencode" && targets.includes("codex");

function rulesBlock(layer: Layer, target: Target): string {
  const parts: string[] = [];
  const compat = join(RESOURCES_DIR, target, "compat.md");
  if (layer === "global" && existsSync(compat)) {
    parts.push(readFileSync(compat, "utf-8").replaceAll("{{RESOURCES_DIR}}", RESOURCES_DIR).trim());
  }
  for (const [entry, src] of resolveEntries(layer, "rules", target)) {
    if (!entry.endsWith(".md")) continue;
    // demote headings so rules nest under the block title
    parts.push(readFileSync(src, "utf-8").trim().replace(/^(#+) /gm, "#$1 "));
  }
  return parts.join("\n\n");
}

/** A real directory at `dir` (an older install may have left a symlink there). */
function ensureRealDir(dir: string): void {
  try {
    if (lstatSync(dir).isSymbolicLink()) unlinkSync(dir);
  } catch {
    // missing
  }
  ensureDir(dir);
}

function writeGenerated(dir: string, files: Map<string, string>): void {
  ensureDir(dir);
  const keep = new Set<string>();
  for (const [fileName, content] of files) {
    const full = join(dir, fileName);
    keep.add(full);
    if (existsSync(full) && !isManagedFile(full)) {
      log.warn(`  Pulado ${fileName}: existe e não é gerenciado pelo ${MANAGED_NAME}`);
      continue;
    }
    writeFileSync(full, content);
    log.success(`  ${fileName}`);
  }
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (!keep.has(full) && f.startsWith(PREFIX) && isManagedFile(full)) {
      unlinkSync(full);
      log.dim(`  removido ${f}`);
    }
  }
}

export function installLayer(layer: Layer, target: Target, targets: Target[], projectPath = ""): void {
  const d = dest(layer, target, projectPath);
  const label = TARGET_LABEL[target];

  // skills: symlinks, live-editable
  const skills = resolveEntries(layer, "skills", target);
  if (sharesCodexSkills(target, targets)) {
    unlinkOurs(d.skills);
    log.info(`${label}: skills → usa as do Codex (.agents/skills)`);
    for (const name of divergent(layer, "skills", "codex", target)) {
      log.warn(`  ${name}: OpenCode e Codex compartilham .agents/skills — vale a versão do Codex`);
    }
  } else {
    log.info(`${label}: skills`);
    unlinkOurs(d.skills);
    for (const [name, src] of skills) linkOne(src, join(d.skills, name));
  }
  if (target === "codex" && layer === "global") unlinkOurs(CODEX_LEGACY_SKILLS_DIR);

  // agents: rendered per AI
  log.info(`${label}: agents`);
  unlinkOurs(d.agents); // links from older installs
  const agents = new Map<string, string>();
  for (const [entry, src] of resolveEntries(layer, "agents", target)) {
    if (!entry.endsWith(".md")) continue;
    const { fileName, content } = renderAgent(parseAgent(src), target);
    agents.set(fileName, content);
  }
  writeGenerated(d.agents, agents);

  // OpenCode: one /<skill> command per skill it can see
  if (d.commands) {
    log.info(`${label}: commands /${PREFIX}*`);
    const commands = new Map<string, string>();
    for (const [name, src] of skills) {
      const description = frontmatterField(join(src, "SKILL.md"), "description") ?? name;
      commands.set(`${name}.md`, opencodeSkillCommand(name, description));
    }
    writeGenerated(d.commands, commands);
  }

  // rules
  if ("dir" in d.rules) {
    log.info(`${label}: rules`);
    ensureRealDir(d.rules.dir);
    unlinkOurs(d.rules.dir);
    for (const [entry, src] of resolveEntries(layer, "rules", target)) linkOne(src, join(d.rules.dir, entry));
  } else if (sharesCodexBlock(layer, target, targets)) {
    log.info(`${label}: rules → bloco do Codex no AGENTS.md`);
    for (const name of divergent(layer, "rules", "codex", target)) {
      log.warn(`  ${name}: OpenCode e Codex compartilham o AGENTS.md do projeto — vale a versão do Codex`);
    }
  } else {
    log.info(`${label}: rules (bloco gerenciado no AGENTS.md)`);
    // the global AGENTS.md is a user file → back it up; project files live in git
    upsertBlock(d.rules.block, rulesBlock(layer, target), layer === "global");
    log.success(`  ${d.rules.block}`);
  }
}

/**
 * Remove everything a layer installed for one AI; returns how many items went away.
 * `uninstalling` = every AI being removed in this run (keeps the AGENTS.md block Codex still uses).
 */
export function uninstallLayer(
  layer: Layer,
  target: Target,
  projectPath = "",
  uninstalling: Target[] = [target]
): number {
  const d = dest(layer, target, projectPath);
  let n = unlinkOurs(d.skills) + unlinkOurs(d.agents) + removeManaged(d.agents);
  if (target === "codex" && layer === "global") n += unlinkOurs(CODEX_LEGACY_SKILLS_DIR);
  if (d.commands) n += removeManaged(d.commands);
  if ("dir" in d.rules) {
    n += unlinkOurs(d.rules.dir);
    try {
      if (lstatSync(d.rules.dir).isSymbolicLink()) unlinkSync(d.rules.dir);
      else rmdirSync(d.rules.dir);
      n++;
    } catch {
      // missing or holds user files
    }
  } else if (
    !(sharesCodexBlock(layer, target, ["codex"]) && isTargetPresent("codex") && !uninstalling.includes("codex")) &&
    removeBlock(d.rules.block)
  ) {
    n++;
  }
  return n;
}

export interface Check {
  label: string;
  have: number;
  want: number;
}

/** What `installLayer` would produce vs what is on disk (for `coff doctor`). */
export function checkLayer(layer: Layer, target: Target, targets: Target[], projectPath = ""): Check[] {
  const d = dest(layer, target, projectPath);
  const skillsDir = sharesCodexSkills(target, targets) ? dest(layer, "codex", projectPath).skills : d.skills;
  const count = (dir: string, names: string[]) => names.filter((n) => existsSync(join(dir, n))).length;

  const skills = [...resolveEntries(layer, "skills", target).keys()];
  const agents = [...resolveEntries(layer, "agents", target).values()]
    .filter((src) => src.endsWith(".md"))
    .map((src) => renderAgent(parseAgent(src), target).fileName);
  const checks: Check[] = [
    { label: "skills", have: count(skillsDir, skills), want: skills.length },
    { label: "agents", have: count(d.agents, agents), want: agents.length },
  ];
  if (d.commands) {
    const cmds = skills.map((s) => `${s}.md`);
    checks.push({ label: "commands", have: count(d.commands, cmds), want: cmds.length });
  }
  if ("dir" in d.rules) {
    const rules = [...resolveEntries(layer, "rules", target).keys()];
    checks.push({ label: "rules", have: count(d.rules.dir, rules), want: rules.length });
  } else {
    checks.push({ label: "rules (AGENTS.md)", have: hasBlock(d.rules.block) ? 1 : 0, want: 1 });
  }
  return checks;
}

// ---------- project ----------

const EXCLUDE_BEGIN = `# BEGIN ${MANAGED_NAME}`;
const EXCLUDE_END = `# END ${MANAGED_NAME}`;
const EXCLUDE_RE = new RegExp(`\\n?${EXCLUDE_BEGIN}[\\s\\S]*?${EXCLUDE_END}\\n?`);

/** Keep the per-machine files out of git without touching the project's .gitignore. */
function excludeFromGit(projectPath: string): void {
  const gitDir = join(projectPath, ".git");
  if (!existsSync(gitDir) || !statSync(gitDir).isDirectory()) return;
  const file = join(gitDir, "info", "exclude");
  ensureDir(join(gitDir, "info"));
  const block = [
    EXCLUDE_BEGIN,
    `/${PROJECT_CLAUDE_DIR}/skills/${PREFIX}*`,
    `/${PROJECT_CLAUDE_DIR}/agents/${PREFIX}*`,
    `/${PROJECT_CLAUDE_DIR}/rules/${MANAGED_NAME}`,
    `/${PROJECT_CODEX_SKILLS_DIR}/${PREFIX}*`,
    `/${PROJECT_CODEX_AGENTS_DIR}/${PREFIX}*`,
    `/${PROJECT_OPENCODE_DIR}/skills/${PREFIX}*`,
    `/${PROJECT_OPENCODE_DIR}/agents/${PREFIX}*`,
    `/${PROJECT_OPENCODE_DIR}/commands/${PREFIX}*`,
    EXCLUDE_END,
  ].join("\n");
  const current = existsSync(file) ? readFileSync(file, "utf-8") : "";
  const next = EXCLUDE_RE.test(current)
    ? current.replace(EXCLUDE_RE, `\n${block}\n`)
    : `${current.trimEnd()}${current.trim() ? "\n" : ""}${block}\n`;
  writeFileSync(file, next);
}

export function installProject(projectPath: string, targets: Target[]): void {
  for (const t of targets) installLayer("project", t, targets, projectPath);
  excludeFromGit(projectPath);
}

export function uninstallProject(projectPath: string, targets: Target[]): number {
  return targets.reduce((n, t) => n + uninstallLayer("project", t, projectPath, targets), 0);
}
