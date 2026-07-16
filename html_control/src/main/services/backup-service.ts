import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BackupEntry } from "../../shared/types";
import { CONFIG_PATHS } from "./project-service";

const FILES = Object.values(CONFIG_PATHS);

export class BackupService {
  private readonly backupsRoot: string;

  constructor(
    private readonly blogRoot: string,
    runtimeRoot: string,
    private readonly retention = 30,
  ) {
    this.backupsRoot = join(runtimeRoot, "backups");
  }

  async create(name?: string): Promise<BackupEntry> {
    await mkdir(this.backupsRoot, { recursive: true });
    const createdAt = new Date().toISOString();
    const id = `${createdAt.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    const destination = join(this.backupsRoot, id);
    for (const relative of FILES) {
      const target = join(destination, relative);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(this.blogRoot, relative), target);
    }
    const entry: BackupEntry = { id, name, createdAt, automatic: !name };
    await writeFile(join(destination, "metadata.json"), JSON.stringify(entry, null, 2), "utf8");
    await this.enforceRetention();
    return entry;
  }

  async list(): Promise<BackupEntry[]> {
    await mkdir(this.backupsRoot, { recursive: true });
    const directories = await readdir(this.backupsRoot, { withFileTypes: true });
    const entries = await Promise.all(
      directories
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            return JSON.parse(await readFile(join(this.backupsRoot, entry.name, "metadata.json"), "utf8")) as BackupEntry;
          } catch {
            return null;
          }
        }),
    );
    return entries
      .filter((entry): entry is BackupEntry => Boolean(entry))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async restore(id: string): Promise<void> {
    const entry = (await this.list()).find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`找不到备份：${id}`);
    await this.create("恢复前自动备份");
    const sourceRoot = join(this.backupsRoot, id);
    for (const relative of FILES) {
      const target = join(this.blogRoot, relative);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(sourceRoot, relative), target);
    }
  }

  private async enforceRetention(): Promise<void> {
    const automatic = (await this.list()).filter((entry) => entry.automatic);
    for (const entry of automatic.slice(this.retention)) {
      await rm(join(this.backupsRoot, entry.id), { recursive: true, force: true });
    }
  }
}
