#!/usr/bin/env node
// Cross-platform installer: dependencies + build + `coff` on PATH + `coff install`.
//
//   node scripts/install.mjs [coff install flags]     e.g. --opencode --profile free
//
// Called by install.sh (macOS/Linux) and install.cmd / install.ps1 (Windows).
// Safe to re-run (idempotent). Use it after `git pull` too.

import { spawnSync, execSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "dist", "cli.js");
const WIN = process.platform === "win32";
const args = process.argv.slice(2);

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

/** Run a command in ROOT; .cmd shims (pnpm, npx) need a shell on Windows. */
function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: "inherit", shell: WIN, ...opts });
  return r.status === 0;
}

const has = (cmd) => {
  try {
    execSync(WIN ? `where ${cmd}` : `command -v ${cmd}`, { stdio: "ignore", shell: WIN ? undefined : "/bin/sh" });
    return true;
  } catch {
    return false;
  }
};

const major = Number(process.versions.node.split(".")[0]);
if (major < 18) fail(`Node ${process.version} — precisa >= 18. Baixe em https://nodejs.org`);

console.log("→ Dependências + build");
const pnpm = has("pnpm") ? ["pnpm", []] : ["npx", ["--yes", "pnpm@9"]];
if (!run(pnpm[0], [...pnpm[1], "install", "--silent"])) fail("falha instalando dependências");
if (!run(pnpm[0], [...pnpm[1], "build"], { stdio: ["inherit", "ignore", "inherit"] })) fail("falha no build");
if (!WIN) chmodSync(CLI, 0o755);

console.log("→ Comando 'coff' no PATH");
/** npm's global prefix. npm may redact path parts in its output (e.g. "***"), so verify it exists. */
function npmGlobalPrefix() {
  try {
    const out = execSync("npm prefix -g", { encoding: "utf-8", shell: WIN ? undefined : "/bin/sh" }).trim();
    // %APPDATA%\npm may not exist yet on a fresh Windows install: that's fine, we create it
    if (out && !out.includes("***")) return out;
  } catch {
    // fall through
  }
  // npm's default: the dir holding node on Windows, its parent on Unix
  return WIN ? dirname(process.execPath) : dirname(dirname(process.execPath));
}

// npm's global bin: <prefix>/bin on Unix, <prefix> itself on Windows (already on PATH)
const prefix = process.env.npm_config_prefix || npmGlobalPrefix();
const binDir = WIN ? prefix : join(prefix, "bin");

function writeShims(dir) {
  mkdirSync(dir, { recursive: true });
  if (WIN) {
    writeFileSync(join(dir, "coff.cmd"), `@echo off\r\nnode "${CLI}" %*\r\n`);
    writeFileSync(join(dir, "coff.ps1"), `node "${CLI}" @args\r\nexit $LASTEXITCODE\r\n`);
    writeFileSync(join(dir, "coff"), `#!/bin/sh\nexec node "${CLI.replaceAll("\\", "/")}" "$@"\n`); // Git Bash
  } else {
    const link = join(dir, "coff");
    rmSync(link, { force: true });
    symlinkSync(CLI, link);
  }
}

let installed = "";
for (const dir of [binDir, WIN ? "" : join(homedir(), ".local", "bin")].filter(Boolean)) {
  try {
    writeShims(dir);
    installed = dir;
    break;
  } catch {
    // not writable: try the next one
  }
}
if (!installed) fail("não consegui criar o comando `coff` (sem permissão no diretório global do npm).");
console.log(`  ${installed}${WIN ? "\\coff.cmd" : "/coff"} -> ${CLI}`);
const onPath = (process.env.PATH ?? "").split(WIN ? ";" : ":").some((p) => resolve(p) === resolve(installed));
if (!onPath) {
  console.log(
    WIN
      ? `  ! ${installed} não está no PATH. Adicione em: Configurações → Sistema → Sobre → Configurações avançadas → Variáveis de ambiente.`
      : `  ! ${installed} não está no PATH — adicione ao ~/.zshrc ou ~/.bashrc: export PATH="${installed}:$PATH"`
  );
}

if (!existsSync(CLI)) fail(`build não gerou ${CLI}`);
process.exit(run(process.execPath, [CLI, "install", ...args], { shell: false }) ? 0 : 1);
