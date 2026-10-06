import { readFileSync } from "fs";
import { basename } from "path";
import { MANAGED_MARKER } from "../constants.js";
import type { Target } from "./targets.js";
import { targetConfig } from "./resources.js";

/**
 * Agents are written once with neutral frontmatter:
 *   name, description, tier (deep|fast), readonly (true|false)
 * and rendered into each AI's own format.
 */
export interface AgentDef {
  name: string;
  description: string;
  tier: string;
  readonly: boolean;
  body: string;
  file: string;
}

export function parseAgent(file: string): AgentDef {
  const raw = readFileSync(file, "utf-8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const front = m ? m[1] : "";
  const body = (m ? m[2] : raw).trim();
  const field = (key: string): string | undefined => {
    const line = front.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
    return line ? line[1].trim().replace(/^["']|["']$/g, "") : undefined;
  };
  return {
    name: field("name") ?? basename(file, ".md"),
    description: field("description") ?? "",
    tier: field("tier") ?? "fast",
    readonly: field("readonly") === "true",
    body,
    file,
  };
}

/** JSON string escapes are valid in YAML double-quoted strings and TOML basic strings. */
const quote = (s: string): string => JSON.stringify(s);

const generatedNote = (agent: AgentDef): string =>
  `${MANAGED_MARKER} — gerado de ${agent.file}. Edite a fonte e rode \`coff install\`.`;

function toClaude(agent: AgentDef): string {
  const model = targetConfig("claude").tiers[agent.tier];
  return [
    "---",
    `name: ${agent.name}`,
    `description: ${quote(agent.description)}`,
    ...(model ? [`model: ${model}`] : []),
    ...(agent.readonly ? ["disallowedTools: Edit, Write, NotebookEdit"] : []),
    `# ${generatedNote(agent)}`,
    "---",
    "",
    agent.body,
    "",
  ].join("\n");
}

function toCodex(agent: AgentDef): string {
  const effort = targetConfig("codex").tiers[agent.tier];
  return [
    `# ${generatedNote(agent)}`,
    `name = ${quote(agent.name)}`,
    `description = ${quote(agent.description)}`,
    ...(effort ? [`model_reasoning_effort = ${quote(effort)}`] : []),
    ...(agent.readonly ? [`sandbox_mode = "read-only"`] : []),
    `developer_instructions = ${quote(agent.body)}`,
    "",
  ].join("\n");
}

function toOpencode(agent: AgentDef): string {
  const model = targetConfig("opencode").tiers[agent.tier];
  return [
    "---",
    `description: ${quote(agent.description)}`,
    "mode: subagent",
    ...(model ? [`model: ${model}`] : []),
    ...(agent.readonly ? ["permission:", "  edit: deny"] : []),
    `# ${generatedNote(agent)}`,
    "---",
    "",
    agent.body,
    "",
  ].join("\n");
}

export function renderAgent(agent: AgentDef, target: Target): { fileName: string; content: string } {
  switch (target) {
    case "claude":
      return { fileName: `${agent.name}.md`, content: toClaude(agent) };
    case "codex":
      return { fileName: `${agent.name}.toml`, content: toCodex(agent) };
    case "opencode":
      return { fileName: `${agent.name}.md`, content: toOpencode(agent) };
  }
}

/** OpenCode has no slash invocation for skills: expose each one as a /<skill> command. */
export function opencodeSkillCommand(skill: string, description: string): string {
  return [
    "---",
    `description: ${quote(description)}`,
    `# ${MANAGED_MARKER}`,
    "---",
    "",
    `Load the \`${skill}\` skill with the \`skill\` tool and follow it exactly.`,
    "",
    "Arguments: $ARGUMENTS",
    "",
  ].join("\n");
}
