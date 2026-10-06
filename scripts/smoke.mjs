#!/usr/bin/env node
// Smoke test: runs the built CLI against a throwaway HOME and checks what lands on disk.
// Same script on macOS, Linux and Windows (used by CI).  Usage: node scripts/smoke.mjs

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "dist", "cli.js");
const home = mkdtempSync(join(tmpdir(), "coff-home-"));
const project = mkdtempSync(join(tmpdir(), "coff-proj-"));
const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home, // os.homedir() on Windows
  CODEX_HOME: join(home, ".codex"),
  OPENCODE_CONFIG_DIR: join(home, ".config", "opencode"),
};
let failures = 0;

function coff(...args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { env, cwd: project, encoding: "utf-8" });
  if (r.status !== 0) {
    console.error(`✗ coff ${args.join(" ")} exited ${r.status}\n${r.stdout}\n${r.stderr}`);
    process.exit(1);
  }
  return r.stdout;
}

function check(label, ok) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

const at = (...p) => existsSync(join(...p));

try {
  for (const d of [".claude", ".codex", join(".config", "opencode")]) mkdirSync(join(home, d), { recursive: true });
  spawnSync("git", ["init", "-q"], { cwd: project });
  writeFileSync(join(project, "package.json"), '{"name":"smoke"}');

  // default profile, all three AIs
  coff("install", "--claude", "--codex", "--opencode");
  check("claude global skill", at(home, ".claude", "skills", "coff-research", "SKILL.md"));
  check("claude global agent", at(home, ".claude", "agents", "coff-reviewer.md"));
  check("claude global rules", at(home, ".claude", "rules", "c0ffe-tools", "base.md"));
  check("codex skill in ~/.agents", at(home, ".agents", "skills", "coff-research", "SKILL.md"));
  check("codex agent toml", at(home, ".codex", "agents", "coff-reviewer.toml"));
  check("opencode agent", at(home, ".config", "opencode", "agents", "coff-reviewer.md"));
  check("opencode command", at(home, ".config", "opencode", "commands", "coff-research.md"));
  check("opencode plugin", at(home, ".config", "opencode", "plugins", "coff-context.js"));
  const settings = JSON.parse(readFileSync(join(home, ".claude", "settings.json"), "utf-8"));
  check("claude hook uses node", JSON.stringify(settings.hooks).includes("context-reinject.mjs"));

  coff("init", project, "-y", "--client", "smoke");
  check("project pipeline (claude)", at(project, ".claude", "skills", "coff-plan", "SKILL.md"));
  check("project pipeline (codex)", at(project, ".codex", "agents", "coff-architect.toml"));
  check("project pipeline (opencode)", at(project, ".opencode", "commands", "coff-plan.md"));
  check("project AGENTS.md block", readFileSync(join(project, "AGENTS.md"), "utf-8").includes("BEGIN c0ffe-tools"));

  // context hook, as Claude/Codex call it
  const hook = spawnSync(process.execPath, [join(ROOT, "resources", "hooks", "context-reinject.mjs")], {
    input: JSON.stringify({ source: "compact", cwd: project }),
    encoding: "utf-8",
  });
  check("context hook output", hook.stdout.includes("Project Context"));

  // free profile (OpenCode only)
  coff("install", "--profile", "free");
  const oc = JSON.parse(readFileSync(join(home, ".config", "opencode", "opencode.json"), "utf-8"));
  check("free profile sets an opencode/ model", typeof oc.model === "string" && oc.model.startsWith("opencode/"));
  check("free profile rules", readFileSync(join(home, ".config", "opencode", "AGENTS.md"), "utf-8").includes("Plano gratuito"));
  coff("install", "--profile", "default");

  coff("uninstall", "--claude", "--codex", "--opencode");
  check("uninstall removes global skills", !at(home, ".claude", "skills", "coff-research"));
  check("uninstall removes project pipeline", !at(project, ".opencode", "commands", "coff-plan.md"));
} finally {
  rmSync(home, { recursive: true, force: true });
  rmSync(project, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nsmoke ok");
