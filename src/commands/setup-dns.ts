import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { CERTS_DIR, LOCAL_DOMAIN } from "../constants.js";
import { ensureDir } from "../utils/config.js";
import { log } from "../utils/log.js";

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function installWithBrew(pkg: string): void {
  log.info(`Installing ${pkg} via Homebrew...`);
  execSync(`brew install ${pkg}`, { stdio: "inherit" });
  log.success(`${pkg} installed`);
}

function configureDnsmasq(): void {
  log.info("Configuring dnsmasq for wildcard DNS...");

  const dnsmasqConf = "/opt/homebrew/etc/dnsmasq.conf";
  const entry = `address=/.${LOCAL_DOMAIN}/127.0.0.1`;

  if (existsSync(dnsmasqConf)) {
    const content = readFileSync(dnsmasqConf, "utf-8");
    if (content.includes(entry)) {
      log.dim("dnsmasq already configured");
    } else {
      execSync(`echo '${entry}' | sudo tee -a ${dnsmasqConf}`, {
        stdio: "inherit",
      });
      log.success("dnsmasq config updated");
    }
  } else {
    writeFileSync(dnsmasqConf, entry + "\n");
    log.success("dnsmasq config created");
  }

  // Create resolver directory and config
  const resolverDir = "/etc/resolver";
  try {
    execSync(`sudo mkdir -p ${resolverDir}`, { stdio: "pipe" });
    execSync(
      `echo 'nameserver 127.0.0.1' | sudo tee ${resolverDir}/${LOCAL_DOMAIN}`,
      { stdio: "inherit" }
    );
    log.success(`Resolver created: ${resolverDir}/${LOCAL_DOMAIN}`);
  } catch (err) {
    log.error("Failed to create resolver config (needs sudo)");
    throw err;
  }

  // Restart dnsmasq
  try {
    execSync("sudo brew services restart dnsmasq", { stdio: "inherit" });
    log.success("dnsmasq restarted");
  } catch {
    log.warn("Could not restart dnsmasq via brew services");
  }
}

function generateCerts(): void {
  log.info("Generating wildcard TLS certificates...");
  ensureDir(CERTS_DIR);

  const certFile = join(CERTS_DIR, "wildcard.pem");
  const keyFile = join(CERTS_DIR, "wildcard-key.pem");

  if (existsSync(certFile) && existsSync(keyFile)) {
    log.dim("Certificates already exist");
    return;
  }

  if (!commandExists("mkcert")) {
    installWithBrew("mkcert");
    execSync("mkcert -install", { stdio: "inherit" });
  }

  execSync(
    `mkcert -cert-file "${certFile}" -key-file "${keyFile}" "*.${LOCAL_DOMAIN}"`,
    { stdio: "inherit" }
  );
  log.success("Wildcard certificate generated");
}

export async function setupDnsCommand(): Promise<void> {
  log.header("C0FFE Tools - DNS & Proxy Setup");

  // Check for Homebrew
  if (!commandExists("brew")) {
    log.error("Homebrew is required. Install from https://brew.sh");
    process.exit(1);
  }

  // Install dnsmasq
  if (!commandExists("dnsmasq")) {
    installWithBrew("dnsmasq");
  } else {
    log.dim("dnsmasq already installed");
  }

  // Install Caddy
  if (!commandExists("caddy")) {
    installWithBrew("caddy");
  } else {
    log.dim("Caddy already installed");
  }

  // Configure dnsmasq
  configureDnsmasq();

  // Generate certs
  generateCerts();

  log.header("Setup complete!");
  log.info(`Wildcard DNS: *.${LOCAL_DOMAIN} -> 127.0.0.1`);
  log.info("Verify with: dig test.coff.test @127.0.0.1");
  log.info('Run "coff up <feature>" to start dev servers.');
}
