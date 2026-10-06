#!/usr/bin/env node
// context-reinject.mjs — re-injects the active .harness/ context after compaction.
//
// Claude Code / Codex: SessionStart hook (`node context-reinject.mjs`), reads the
// hook JSON on stdin and prints {"hookSpecificOutput":{"additionalContext":...}}.
// Runs only when the session starts from a compaction (source=compact); set
// COFF_CONTEXT_ON_START=1 to also inject on startup/resume.
// OpenCode: the generated plugin imports buildContext() directly.
//
// Plain Node, no dependencies: works the same on macOS, Linux and Windows.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const read = (file) => (existsSync(file) ? readFileSync(file, "utf-8") : "");

function gitBranch(dir) {
  try {
    return execFileSync("git", ["-C", dir, "branch", "--show-current"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const isGitRepo = (dir) => existsSync(join(dir, ".git"));

/** Markdown context for the project at `projectDir`, or "" when it has no .harness/. */
export function buildContext(projectDir) {
  const harness = join(projectDir, ".harness");
  const configFile = join(harness, "config.json");
  if (!existsSync(configFile)) return "";

  const out = ["---", "## Project Context (re-injected after compaction)", ""];
  const config = read(configFile);
  out.push("### Project Config", "```json", config.trim(), "```", "");

  const styleguide = read(join(harness, "styleguide.md"));
  if (styleguide) {
    out.push("### Style Guide (summary)", styleguide.split("\n").slice(0, 50).join("\n"), "");
    out.push("_(Full style guide: .harness/styleguide.md)_", "");
  }

  const features = read(join(harness, "memory", "features.md"));
  if (features) out.push("### Feature Status", features.trim(), "");

  let repos = [];
  try {
    repos = (JSON.parse(config).repos ?? []).map((r) => r.path);
  } catch {
    // invalid config: fall back to the root
  }
  if (repos.length === 0) repos = ["."];

  let featureSlug = "";
  out.push("### Repositories");
  for (const repo of repos) {
    const full = resolve(projectDir, repo);
    if (!isGitRepo(full)) continue;
    const branch = gitBranch(full);
    out.push(`- \`${repo}\`: branch \`${branch}\``);
    if (!featureSlug && branch) featureSlug = branch.replace(/^feature\//, "");
  }
  out.push("");

  const planDir = featureSlug ? join(harness, "plans", featureSlug) : "";
  if (planDir && existsSync(planDir)) {
    out.push(`### Active Feature: ${featureSlug}`, "");
    for (const [file, title] of [
      ["context-brief.md", "Context Brief"],
      ["implementation-plan.md", "Implementation Plan"],
      ["implementation-notes.md", "Implementation Notes"],
    ]) {
      const text = read(join(planDir, file));
      if (text) out.push(`#### ${title}`, text.trim(), "");
    }
  }

  out.push("---");
  return out.join("\n");
}

async function main() {
  let input = {};
  if (!process.stdin.isTTY) {
    let raw = "";
    for await (const chunk of process.stdin) raw += chunk;
    try {
      input = JSON.parse(raw || "{}");
    } catch {
      input = {};
    }
  }
  const source = typeof input.source === "string" ? input.source : "";
  if (source && source !== "compact" && process.env.COFF_CONTEXT_ON_START !== "1") return;

  const projectDir = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const context = buildContext(projectDir);
  if (!context) return;
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } })
  );
}

const isEntry = () => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};
if (process.argv[1] && isEntry()) main();
