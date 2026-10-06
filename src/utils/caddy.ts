import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { CADDYFILE_PATH, CERTS_DIR } from "../constants.js";
import { loadRunning } from "./process.js";
import { log } from "./log.js";
import { join } from "path";

function roleToHandlePath(role: string): string | null {
  switch (role) {
    case "backend":
      return "/api/*";
    case "worker":
      return "/worker/*";
    default:
      return null; // catch-all
  }
}

function getRolePriority(role: string): number {
  // Specific paths first, catch-all last
  switch (role) {
    case "backend":
      return 0;
    case "worker":
      return 1;
    case "site":
      return 10;
    case "frontend":
      return 10;
    default:
      return 5;
  }
}

export function generateCaddyfile(): string {
  const state = loadRunning();
  if (state.features.length === 0) return "# No active features\n";

  const certFile = join(CERTS_DIR, "wildcard.pem");
  const keyFile = join(CERTS_DIR, "wildcard-key.pem");

  const blocks: string[] = [];

  for (const feature of state.features) {
    const sorted = [...feature.processes].sort(
      (a, b) => getRolePriority(a.role) - getRolePriority(b.role)
    );

    const handles: string[] = [];
    for (const proc of sorted) {
      const path = roleToHandlePath(proc.role);
      if (path) {
        handles.push(
          `  handle ${path} {\n    reverse_proxy localhost:${proc.port}\n  }`
        );
      } else {
        handles.push(
          `  handle {\n    reverse_proxy localhost:${proc.port}\n  }`
        );
      }
    }

    blocks.push(
      `${feature.domain} {\n  tls ${certFile} ${keyFile}\n${handles.join("\n")}\n}`
    );
  }

  return blocks.join("\n\n") + "\n";
}

export function writeCaddyfile(): void {
  const content = generateCaddyfile();
  writeFileSync(CADDYFILE_PATH, content);
}

export function reloadCaddy(): void {
  try {
    execSync(`caddy reload --config "${CADDYFILE_PATH}"`, {
      stdio: "pipe",
    });
    log.success("Caddy reloaded");
  } catch (err) {
    // Caddy might not be running yet, try starting it
    try {
      execSync(
        `caddy start --config "${CADDYFILE_PATH}"`,
        { stdio: "pipe" }
      );
      log.success("Caddy started");
    } catch {
      log.error("Failed to start/reload Caddy. Is it installed? Run: coff setup-dns");
    }
  }
}

export function stopCaddyIfEmpty(): void {
  const state = loadRunning();
  if (state.features.length === 0) {
    try {
      execSync("caddy stop", { stdio: "pipe" });
      log.dim("Caddy stopped (no active features)");
    } catch {
      // not running, that's fine
    }
  }
}
