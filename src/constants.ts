import { homedir } from "os";
import { join } from "path";

export const STATE_DIR = join(homedir(), ".c0ffe-tools");
export const REGISTRY_PATH = join(STATE_DIR, "registry.json");
export const BACKUPS_DIR = join(STATE_DIR, "backups");
export const CLAUDE_DIR = join(homedir(), ".claude");
export const CLAUDE_SKILLS_DIR = join(CLAUDE_DIR, "skills");
export const CLAUDE_AGENTS_DIR = join(CLAUDE_DIR, "agents");
export const CLAUDE_RULES_DIR = join(CLAUDE_DIR, "rules");
export const CLAUDE_SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");

// Codex CLI (respects $CODEX_HOME like codex itself)
export const CODEX_DIR = process.env.CODEX_HOME || join(homedir(), ".codex");
// Codex reads user skills from ~/.agents/skills (not ~/.codex/skills); OpenCode reads it too
export const AGENTS_HOME_DIR = join(homedir(), ".agents");
export const CODEX_SKILLS_DIR = join(AGENTS_HOME_DIR, "skills");
export const CODEX_LEGACY_SKILLS_DIR = join(CODEX_DIR, "skills");
export const CODEX_AGENTS_DIR = join(CODEX_DIR, "agents");
export const CODEX_AGENTS_MD = join(CODEX_DIR, "AGENTS.md");
export const CODEX_HOOKS_PATH = join(CODEX_DIR, "hooks.json");

// OpenCode (respects $OPENCODE_CONFIG_DIR like opencode itself)
export const OPENCODE_DIR =
  process.env.OPENCODE_CONFIG_DIR || join(homedir(), ".config", "opencode");
export const OPENCODE_SKILLS_DIR = join(OPENCODE_DIR, "skills");
export const OPENCODE_AGENTS_DIR = join(OPENCODE_DIR, "agents");
export const OPENCODE_COMMANDS_DIR = join(OPENCODE_DIR, "commands");
export const OPENCODE_PLUGINS_DIR = join(OPENCODE_DIR, "plugins");
export const OPENCODE_AGENTS_MD = join(OPENCODE_DIR, "AGENTS.md");

// Name of the folder/block c0ffe-tools owns inside the agent config dirs
export const MANAGED_NAME = "c0ffe-tools";
export const MANAGED_MARKER = "managed by c0ffe-tools";

// Project-level install locations (relative to the project root)
export const PROJECT_CLAUDE_DIR = ".claude";
export const PROJECT_CODEX_SKILLS_DIR = join(".agents", "skills");
export const PROJECT_CODEX_AGENTS_DIR = join(".codex", "agents");
export const PROJECT_OPENCODE_DIR = ".opencode";

// Prefix of every skill/agent/command c0ffe-tools ships
export const PREFIX = "coff-";

export const HARNESS_DIR = ".harness";
export const HARNESS_CONFIG = "config.json";
export const HARNESS_MEMORY_DIR = "memory";
export const HARNESS_PLANS_DIR = "plans";
export const HARNESS_ASSETS_DIR = "assets";

// Dev server management
export const PORTS_PATH = join(STATE_DIR, "ports.json");
export const RUNNING_PATH = join(STATE_DIR, "running.json");
export const CADDYFILE_PATH = join(STATE_DIR, "Caddyfile");
export const CERTS_DIR = join(STATE_DIR, "certs");
export const LOGS_DIR = join(STATE_DIR, "logs");

// Port allocation range
export const PORT_RANGE_START = 10000;
export const PORT_RANGE_END = 59900;
export const PORT_BLOCK_SIZE = 100;

// Domain
export const LOCAL_DOMAIN = "coff.test";
