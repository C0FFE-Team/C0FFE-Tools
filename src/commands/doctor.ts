import { existsSync, readFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import {
  CLAUDE_SETTINGS_PATH,
  CODEX_DIR,
  CODEX_HOOKS_PATH,
  OPENCODE_DIR,
  HARNESS_DIR,
  HARNESS_CONFIG,
} from "../constants.js";
import { log } from "../utils/log.js";
import { TARGETS, TARGET_LABEL, type Target, commandExists, detectTargets, hasHook } from "../utils/targets.js";
import { type Layer, checkLayer } from "../utils/layers.js";
import { hasOpencodePlugin } from "../utils/opencode.js";
import { warnOverlaps } from "./install.js";

type Level = "ok" | "warn" | "fail";

function row(level: Level, label: string, hint = ""): void {
  const icon = level === "ok" ? chalk.green("✓") : level === "warn" ? chalk.yellow("!") : chalk.red("✗");
  console.log(`${icon} ${label}${hint ? chalk.dim(`  — ${hint}`) : ""}`);
}

async function figmaDesktopUp(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    await fetch("http://127.0.0.1:3845/mcp", { signal: ctrl.signal });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

const MCPS = [
  ["figma", "coff-styleguide, coff-implement, coff-read-figma"],
  ["notion", "coff-plan, coff-read-prd (PRD no Notion)"],
  ["atlassian", "coff-tracker (só se o tracker for Jira)"],
  ["playwright", "coff-visual-test, coff-linear"],
] as const;

const readOr = (file: string): string => (existsSync(file) ? readFileSync(file, "utf-8") : "");

/** Claude's MCPs live in ~/.claude.json and claude.ai connectors: not checked here. */
function mcpConfigured(target: Target, name: string): boolean | undefined {
  if (target === "codex") {
    return new RegExp(`^\\[mcp_servers\\.${name}\\]`, "m").test(readOr(join(CODEX_DIR, "config.toml")));
  }
  if (target === "opencode") {
    const cfg = readOr(join(OPENCODE_DIR, "opencode.json")) + readOr(join(OPENCODE_DIR, "opencode.jsonc"));
    return new RegExp(`"${name}"\\s*:`).test(cfg);
  }
  return undefined;
}

function hookInstalled(target: Target): boolean {
  if (target === "claude") return hasHook(CLAUDE_SETTINGS_PATH);
  if (target === "codex") return hasHook(CODEX_HOOKS_PATH);
  return hasOpencodePlugin();
}

function layerRows(layer: Layer, target: Target, targets: Target[], projectPath = ""): void {
  const fix = layer === "global" ? `rode coff install --${target}` : "rode coff init";
  for (const c of checkLayer(layer, target, targets, projectPath)) {
    const ok = c.have === c.want;
    row(ok ? "ok" : "fail", `${c.label} ${c.have}/${c.want}`, ok ? "" : fix);
  }
}

export async function doctorCommand(): Promise<void> {
  log.header("C0FFE Tools - Doctor");

  const major = Number(process.versions.node.split(".")[0]);
  row(major >= 18 ? "ok" : "fail", `Node ${process.versions.node}`, major >= 18 ? "" : "precisa >= 18");

  const targets = detectTargets();
  for (const t of TARGETS) {
    console.log(chalk.bold(`\n${TARGET_LABEL[t]} (global)`));
    if (!targets.includes(t)) {
      row("warn", "não encontrado");
      continue;
    }
    layerRows("global", t, targets);
    const hook = hookInstalled(t);
    row(hook ? "ok" : "fail", t === "opencode" ? "plugin de contexto" : "hook de contexto", hook ? "" : `rode coff install --${t}`);
    for (const [name, use] of MCPS) {
      const ok = mcpConfigured(t, name);
      if (ok === undefined) continue;
      row(ok ? "ok" : "warn", `MCP ${name}`, ok ? "" : `não configurado — usado por ${use}. Ver resources/docs/MCP_SETUP.md`);
    }
  }
  warnOverlaps(targets);

  console.log(chalk.bold("\nFerramentas"));
  const figma = await figmaDesktopUp();
  row(figma ? "ok" : "warn", "Figma Desktop MCP (127.0.0.1:3845)", figma ? "" : "abra o Figma Desktop e ative o MCP Server");
  row(process.env.LINEAR_API_KEY ? "ok" : "warn", "LINEAR_API_KEY", process.env.LINEAR_API_KEY ? "" : "necessário se o tracker for Linear");
  for (const [cmd, use] of [
    ["gh", "coff-create-pr, coff-publisher"],
    ["railway", "coff-deploy (backend)"],
    ["vercel", "coff-deploy (frontend)"],
    ["caddy", "coff up / setup-dns"],
  ] as const) {
    const ok = commandExists(cmd);
    row(ok ? "ok" : "warn", cmd, ok ? "" : `não instalado — usado por ${use}`);
  }

  console.log(chalk.bold("\nProjeto atual"));
  const cwd = process.cwd();
  if (!existsSync(join(cwd, HARNESS_DIR, HARNESS_CONFIG))) {
    row("warn", "sem .harness/ aqui", "rode coff init para configurar este projeto");
    console.log();
    return;
  }
  row("ok", `${HARNESS_DIR}/${HARNESS_CONFIG} encontrado`);
  for (const t of targets) {
    console.log(chalk.dim(`  ${TARGET_LABEL[t]}`));
    layerRows("project", t, targets, cwd);
  }
  console.log();
}
