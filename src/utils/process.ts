import { spawn, spawnSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, openSync } from "fs";
import { join } from "path";
import { RUNNING_PATH, LOGS_DIR } from "../constants.js";
import { ensureDir } from "./config.js";
import { dirname } from "path";
import type { RunningState, RunningFeature, ProcessEntry } from "../types.js";
import { IS_WINDOWS } from "./targets.js";

export function loadRunning(): RunningState {
  if (!existsSync(RUNNING_PATH)) return { features: [] };
  return JSON.parse(readFileSync(RUNNING_PATH, "utf-8"));
}

export function saveRunning(state: RunningState): void {
  ensureDir(dirname(RUNNING_PATH));
  writeFileSync(RUNNING_PATH, JSON.stringify(state, null, 2) + "\n");
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getDevCommand(
  stack: string,
  port: number
): { cmd: string; args: string[]; env: Record<string, string> } {
  switch (stack) {
    case "nestjs":
      return {
        cmd: "pnpm",
        args: ["start:dev"],
        env: { PORT: String(port) },
      };
    case "next":
      return {
        cmd: "pnpm",
        args: ["dev", "--port", String(port)],
        env: {},
      };
    case "react":
      return {
        cmd: "pnpm",
        args: ["dev", "--port", String(port)],
        env: {},
      };
    case "cloudflare-workers":
      return {
        cmd: "pnpm",
        args: ["dev", "--port", String(port)],
        env: {},
      };
    default:
      return {
        cmd: "pnpm",
        args: ["dev", "--port", String(port)],
        env: {},
      };
  }
}

export function spawnDevServer(
  featureSlug: string,
  repoName: string,
  role: string,
  stack: string,
  port: number,
  cwd: string
): ProcessEntry {
  const logDir = join(LOGS_DIR, featureSlug);
  ensureDir(logDir);
  const logFile = join(logDir, `${repoName}.log`);

  const { cmd, args, env } = getDevCommand(stack, port);

  const out = openSync(logFile, "a");
  const err = openSync(logFile, "a");

  const child = spawn(cmd, args, {
    cwd,
    // own process group, so `down` can stop the whole tree (pnpm → node)
    detached: true,
    stdio: ["ignore", out, err],
    env: { ...process.env, ...env },
    // pnpm is a .cmd shim on Windows
    shell: IS_WINDOWS,
    windowsHide: true,
  });

  child.unref();

  return {
    repoName,
    role,
    stack,
    pid: child.pid!,
    port,
    cwd,
    logFile,
  };
}

/** Signal the process and its children (process group on Unix, taskkill /T on Windows). */
function signalTree(pid: number, force: boolean): void {
  if (IS_WINDOWS) {
    spawnSync("taskkill", ["/pid", String(pid), "/T", ...(force ? ["/F"] : [])], { stdio: "ignore" });
    return;
  }
  const signal = force ? "SIGKILL" : "SIGTERM";
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // already dead
    }
  }
}

export async function killProcess(pid: number): Promise<void> {
  if (!isProcessAlive(pid)) return;
  signalTree(pid, false);

  // Wait up to 5s for graceful shutdown
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (!isProcessAlive(pid)) return;
  }

  signalTree(pid, true);
}

export async function killFeature(featureSlug: string): Promise<void> {
  const state = loadRunning();
  const feature = state.features.find((f) => f.featureSlug === featureSlug);
  if (!feature) return;

  for (const proc of feature.processes) {
    await killProcess(proc.pid);
  }

  state.features = state.features.filter((f) => f.featureSlug !== featureSlug);
  saveRunning(state);
}

export function addRunningFeature(feature: RunningFeature): void {
  const state = loadRunning();
  // Remove existing entry if any
  state.features = state.features.filter(
    (f) => f.featureSlug !== feature.featureSlug
  );
  state.features.push(feature);
  saveRunning(state);
}
