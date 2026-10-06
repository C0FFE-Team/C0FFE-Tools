import { createServer } from "net";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PORTS_PATH, PORT_RANGE_START, PORT_RANGE_END, PORT_BLOCK_SIZE } from "../constants.js";
import { ensureDir } from "./config.js";
import { dirname } from "path";
import type { PortsMap, PortAllocation } from "../types.js";

export function loadPorts(): PortsMap {
  if (!existsSync(PORTS_PATH)) return { allocations: [] };
  return JSON.parse(readFileSync(PORTS_PATH, "utf-8"));
}

export function savePorts(ports: PortsMap): void {
  ensureDir(dirname(PORTS_PATH));
  writeFileSync(PORTS_PATH, JSON.stringify(ports, null, 2) + "\n");
}

function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function getBlockBase(blockIndex: number): number {
  return PORT_RANGE_START + blockIndex * PORT_BLOCK_SIZE;
}

function totalBlocks(): number {
  return Math.floor((PORT_RANGE_END - PORT_RANGE_START) / PORT_BLOCK_SIZE);
}

export function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function allocatePorts(
  featureSlug: string,
  roles: string[]
): Promise<PortAllocation> {
  const portsMap = loadPorts();

  // Check if already allocated
  const existing = portsMap.allocations.find((a) => a.featureSlug === featureSlug);
  if (existing) return existing;

  const total = totalBlocks();
  const startBlock = hashSlug(featureSlug) % total;

  for (let offset = 0; offset < total; offset++) {
    const blockIndex = (startBlock + offset) % total;
    const base = getBlockBase(blockIndex);

    // Check if block is already taken
    const taken = portsMap.allocations.some((a) => a.basePort === base);
    if (taken) continue;

    // Verify ports are actually available
    const portEntries: [string, number][] = roles.map((role, i) => [role, base + i]);
    let allAvailable = true;
    for (const [, port] of portEntries) {
      if (!(await checkPortAvailable(port))) {
        allAvailable = false;
        break;
      }
    }
    if (!allAvailable) continue;

    const allocation: PortAllocation = {
      featureSlug,
      basePort: base,
      ports: Object.fromEntries(portEntries),
    };

    portsMap.allocations.push(allocation);
    savePorts(portsMap);
    return allocation;
  }

  throw new Error("No available port block found in range");
}

export function releasePorts(featureSlug: string): void {
  const portsMap = loadPorts();
  portsMap.allocations = portsMap.allocations.filter(
    (a) => a.featureSlug !== featureSlug
  );
  savePorts(portsMap);
}
