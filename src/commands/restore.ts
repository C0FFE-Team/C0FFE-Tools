import inquirer from "inquirer";
import { log } from "../utils/log.js";
import { TARGETS, type Target } from "../utils/targets.js";
import { createBackup, listBackups, restoreBackup } from "../utils/backup.js";

interface RestoreOptions {
  yes?: boolean;
}

export async function restoreCommand(id: string | undefined, opts: RestoreOptions = {}): Promise<void> {
  log.header("C0FFE Tools - Restore");
  const backups = listBackups();
  if (backups.length === 0) {
    log.warn("Nenhum backup encontrado.");
    return;
  }

  let backup = id ? backups.find((b) => b.id === id || b.id.startsWith(id)) : undefined;
  if (id && !backup) {
    log.error(`Backup "${id}" não encontrado.`);
    process.exit(1);
  }
  if (!backup) {
    ({ backup } = await inquirer.prompt([
      {
        type: "list",
        name: "backup",
        message: "Restaurar qual backup?",
        choices: backups.map((b) => ({
          name: `${b.id}  (${Object.keys(b.manifest.items).join(" + ")})`,
          value: b,
        })),
      },
    ]));
  }
  const chosen = backup!;

  for (const [target, items] of Object.entries(chosen.manifest.items)) {
    log.info(`${target}: ${items.join(", ")}`);
  }
  if (!opts.yes) {
    const { ok } = await inquirer.prompt([
      { type: "confirm", name: "ok", message: "Substituir esses itens pela versão do backup?", default: false },
    ]);
    if (!ok) return;
  }

  const scopes = Object.keys(chosen.manifest.items);
  const safety = createBackup(TARGETS.filter((t) => scopes.includes(t)) as Target[], "pre-restore");
  log.success(`Estado atual salvo em ${safety.dir}`);
  restoreBackup(chosen);
  log.success(`Restaurado ${chosen.id}`);
}
