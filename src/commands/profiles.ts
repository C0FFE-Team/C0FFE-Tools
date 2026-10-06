import chalk from "chalk";
import { log } from "../utils/log.js";
import { DEFAULT_PROFILE, activeProfileName, listProfiles } from "../utils/profile.js";

export async function profilesCommand(): Promise<void> {
  log.header("C0FFE Tools - Perfis");
  const active = activeProfileName();
  const rows = [
    { name: DEFAULT_PROFILE, description: "Setup padrão: todas as IAs encontradas, modelos de targets.json" },
    ...listProfiles(),
  ];
  for (const p of rows) {
    const mark = p.name === active ? chalk.green("●") : " ";
    console.log(`${mark} ${chalk.bold(p.name.padEnd(10))} ${p.description}`);
  }
  log.dim("\nTrocar: coff install --profile <nome>");
}
