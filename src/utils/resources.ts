import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { RESOURCES_DIR, type Target } from "./targets.js";

/**
 * resources/
 *   shared/<layer>/<kind>/   text every AI gets
 *   <ai>/<layer>/<kind>/     same name = replaces the shared one for that AI; new name = extra
 *   targets.json             per-AI model tiers and excluded names
 *   profiles/<name>/         optional profile: same tree again (shared/, <ai>/) on top, plus profile.json
 */
export type Layer = "global" | "project";
export type Kind = "skills" | "agents" | "rules";

export interface TargetConfig {
  tiers: Record<string, string>;
  exclude: string[];
}

let cache: Record<Target, TargetConfig> | undefined;

/** Set by the active profile (see profile.ts): its directory and its already-resolved settings. */
let profile: { dir: string; tiers: Partial<Record<Target, Record<string, string>>>; exclude: Partial<Record<Target, string[]>> } | undefined;

export function useProfileResources(p: typeof profile): void {
  profile = p;
}

export function targetConfig(target: Target): TargetConfig {
  cache ??= JSON.parse(readFileSync(join(RESOURCES_DIR, "targets.json"), "utf-8"));
  const cfg = cache![target];
  return {
    tiers: { ...(cfg?.tiers ?? {}), ...(profile?.tiers[target] ?? {}) },
    exclude: [...(cfg?.exclude ?? []), ...(profile?.exclude[target] ?? [])],
  };
}

const stripExt = (entry: string): string => entry.replace(/\.md$/, "");

/** entry name (dir or file.md) → source path, for one AI. */
export function resolveEntries(layer: Layer, kind: Kind, target: Target): Map<string, string> {
  const out = new Map<string, string>();
  const roots = [RESOURCES_DIR, ...(profile ? [profile.dir] : [])];
  const bases = roots.flatMap((root) => [join(root, "shared", layer, kind), join(root, target, layer, kind)]);
  for (const base of bases) {
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      if (!entry.startsWith(".")) out.set(entry, join(base, entry));
    }
  }
  const excluded = new Set(targetConfig(target).exclude);
  for (const entry of [...out.keys()]) {
    if (excluded.has(entry) || excluded.has(stripExt(entry))) out.delete(entry);
  }
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)));
}

/** Names whose source differs between two AIs (used where they share a directory/file). */
export function divergent(layer: Layer, kind: Kind, a: Target, b: Target): string[] {
  const ea = resolveEntries(layer, kind, a);
  const eb = resolveEntries(layer, kind, b);
  const names = new Set([...ea.keys(), ...eb.keys()]);
  return [...names].filter((n) => ea.get(n) !== eb.get(n));
}

/** Read one frontmatter field from a markdown file (quotes stripped). */
export function frontmatterField(file: string, key: string): string | undefined {
  const raw = readFileSync(file, "utf-8");
  const front = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const line = front.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return line ? line[1].trim().replace(/^["']|["']$/g, "") : undefined;
}
