import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  OPENCODE_CONFIG_PATH,
  OPENCODE_DIR,
  OPENCODE_ZEN_MODELS_URL,
  SETTINGS_PATH,
} from "../constants.js";
import { ensureDir } from "./config.js";
import { log } from "./log.js";
import { RESOURCES_DIR, TARGETS, type Target, backupOnce } from "./targets.js";
import { useProfileResources } from "./resources.js";

/**
 * A profile is a preset for one kind of user (e.g. `free`: OpenCode free plan,
 * beginner). It lives in resources/profiles/<name>/:
 *   profile.json   AIs to install, model tiers, exclusions, OpenCode defaults
 *   shared/, <ai>/ extra or replacement skills/agents/rules, same layout as resources/
 * Model entries are preference lists: the first one still offered wins, so a
 * profile survives free models being rotated out.
 */
type Prefs = string | string[];

export interface Profile {
  name: string;
  description: string;
  targets?: Target[];
  tiers?: Partial<Record<Target, Record<string, Prefs>>>;
  exclude?: Partial<Record<Target, string[]>>;
  opencode?: {
    model?: Prefs;
    small_model?: Prefs;
    /** written into opencode.json only for keys the user has not set */
    defaults?: Record<string, unknown>;
  };
}

export const DEFAULT_PROFILE = "default";
const PROFILES_DIR = join(RESOURCES_DIR, "profiles");

interface Settings {
  profile?: string;
  /** opencode.json values we wrote, so later installs may update them (and only them) */
  opencodeManaged?: Record<string, unknown>;
}

function loadSettings(): Settings {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(s: Settings): void {
  ensureDir(join(SETTINGS_PATH, ".."));
  writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2) + "\n");
}

export function listProfiles(): Profile[] {
  if (!existsSync(PROFILES_DIR)) return [];
  return readdirSync(PROFILES_DIR)
    .filter((n) => existsSync(join(PROFILES_DIR, n, "profile.json")))
    .map((n) => loadProfile(n)!);
}

export function loadProfile(name: string): Profile | undefined {
  const file = join(PROFILES_DIR, name, "profile.json");
  if (!existsSync(file)) return undefined;
  return { name, ...JSON.parse(readFileSync(file, "utf-8")) };
}

export const activeProfileName = (): string => loadSettings().profile ?? DEFAULT_PROFILE;

/** Persist the chosen profile (`default` clears it). Exits on unknown names. */
export function selectProfile(name: string): void {
  if (name !== DEFAULT_PROFILE && !loadProfile(name)) {
    const names = [DEFAULT_PROFILE, ...listProfiles().map((p) => p.name)];
    log.error(`Perfil "${name}" não existe. Disponíveis: ${names.join(", ")}`);
    process.exit(1);
  }
  const s = loadSettings();
  if (name === DEFAULT_PROFILE) delete s.profile;
  else s.profile = name;
  saveSettings(s);
}

// ---------- model availability ----------

let zenModels: Promise<Set<string> | undefined> | undefined;

/** Model ids currently offered by OpenCode Zen, or undefined when offline. */
export function fetchZenModels(): Promise<Set<string> | undefined> {
  zenModels ??= (async () => {
    try {
      const res = await fetch(OPENCODE_ZEN_MODELS_URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return undefined;
      const body = (await res.json()) as { data?: { id: string }[] };
      return new Set((body.data ?? []).map((m) => `opencode/${m.id}`));
    } catch {
      return undefined;
    }
  })();
  return zenModels;
}

/** First preference still available (non-Zen ids are trusted as-is). */
async function pickModel(prefs: Prefs): Promise<string> {
  const list = Array.isArray(prefs) ? prefs : [prefs];
  const live = await fetchZenModels();
  if (!live) return list[0] ?? "";
  const hit = list.find((m) => !m.startsWith("opencode/") || live.has(m));
  if (!hit) log.warn(`Nenhum destes modelos está disponível agora: ${list.join(", ")} — usando ${list[0]}`);
  return hit ?? list[0] ?? "";
}

// ---------- activation ----------

let active: Profile | undefined;

export const currentProfile = (): Profile | undefined => active;

/** Load the active profile (if any) and resolve its models; call before installing anything. */
export async function useActiveProfile(): Promise<Profile | undefined> {
  const name = activeProfileName();
  active = name === DEFAULT_PROFILE ? undefined : loadProfile(name);
  if (!active) {
    useProfileResources(undefined);
    return undefined;
  }
  const tiers: Partial<Record<Target, Record<string, string>>> = {};
  for (const t of TARGETS) {
    const entries = Object.entries(active.tiers?.[t] ?? {});
    if (!entries.length) continue;
    tiers[t] = {};
    for (const [tier, prefs] of entries) tiers[t]![tier] = await pickModel(prefs);
  }
  useProfileResources({ dir: join(PROFILES_DIR, active.name), tiers, exclude: active.exclude ?? {} });
  return active;
}

/**
 * Write the profile's OpenCode defaults into opencode.json: model/small_model
 * (re-picked on every install, unless the user changed them) and any default
 * key the user has not set. opencode.jsonc is left alone (comments).
 */
export async function applyOpencodeDefaults(profile: Profile): Promise<void> {
  const oc = profile.opencode;
  if (!oc) return;
  if (existsSync(join(OPENCODE_DIR, "opencode.jsonc"))) {
    log.warn("opencode.jsonc encontrado: não edito arquivos com comentários. Ajuste model/small_model à mão (veja coff doctor).");
    return;
  }
  const data: Record<string, unknown> = existsSync(OPENCODE_CONFIG_PATH)
    ? JSON.parse(readFileSync(OPENCODE_CONFIG_PATH, "utf-8"))
    : {};
  const settings = loadSettings();
  const managed = settings.opencodeManaged ?? {};
  const owned = (key: string) => data[key] === undefined || JSON.stringify(data[key]) === JSON.stringify(managed[key]);

  const values: Record<string, unknown> = { $schema: "https://opencode.ai/config.json", ...(oc.defaults ?? {}) };
  if (oc.model) values.model = await pickModel(oc.model);
  if (oc.small_model) values.small_model = await pickModel(oc.small_model);

  let changed = false;
  for (const [key, value] of Object.entries(values)) {
    if (!owned(key) || JSON.stringify(data[key]) === JSON.stringify(value)) continue;
    data[key] = value;
    managed[key] = value;
    changed = true;
    log.success(`  opencode.json: ${key}${typeof value === "string" ? ` = ${value}` : ""}`);
  }
  if (!changed) return;
  backupOnce(OPENCODE_CONFIG_PATH);
  ensureDir(OPENCODE_DIR);
  writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(data, null, 2) + "\n");
  saveSettings({ ...settings, opencodeManaged: managed });
}

/** Configured OpenCode models that Zen no longer offers (for `coff doctor`). */
export async function unavailableOpencodeModels(): Promise<string[] | undefined> {
  const live = await fetchZenModels();
  if (!live || !existsSync(OPENCODE_CONFIG_PATH)) return live ? [] : undefined;
  let cfg: Record<string, unknown> = {};
  try {
    cfg = JSON.parse(readFileSync(OPENCODE_CONFIG_PATH, "utf-8"));
  } catch {
    return [];
  }
  return [cfg.model, cfg.small_model]
    .filter((m): m is string => typeof m === "string" && m.startsWith("opencode/"))
    .filter((m) => !live.has(m));
}
