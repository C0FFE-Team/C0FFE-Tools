import { spawnSync } from "child_process";
import { LOCAL_DOMAIN } from "../constants.js";
import { log } from "../utils/log.js";
import { commandExists } from "../utils/targets.js";

const INSTALL_HINT: Record<string, string> = {
  darwin: "brew install caddy",
  win32: "winget install CaddyServer.Caddy",
  linux: "sudo apt install caddy   (ou veja https://caddyserver.com/docs/install)",
};

/**
 * One-time setup for `coff up`. Browsers resolve *.localhost to 127.0.0.1 on
 * every OS, so there is no DNS to configure: only Caddy, whose local CA gives
 * HTTPS (`tls internal`) once it is trusted.
 */
export async function setupProxyCommand(): Promise<void> {
  log.header("C0FFE Tools - Proxy Setup");

  if (!commandExists("caddy")) {
    log.error("Caddy não encontrado.");
    log.info(`Instale com: ${INSTALL_HINT[process.platform] ?? "https://caddyserver.com/docs/install"}`);
    log.info("Depois rode `coff setup-proxy` de novo.");
    process.exit(1);
  }
  log.success("Caddy encontrado");

  log.info("Confiando na CA local do Caddy (pode pedir senha de administrador)...");
  const trust = spawnSync("caddy", ["trust"], { stdio: "inherit", shell: process.platform === "win32" });
  if (trust.status !== 0) {
    log.warn("`caddy trust` falhou: o navegador vai avisar sobre o certificado até você rodar `caddy trust` como administrador.");
  } else {
    log.success("CA local confiável");
  }

  log.header("Pronto!");
  log.info(`Domínios: https://<feature>.${LOCAL_DOMAIN} → 127.0.0.1 (sem configurar DNS)`);
  log.info('Rode "coff up <feature>" para subir os dev servers.');
}
