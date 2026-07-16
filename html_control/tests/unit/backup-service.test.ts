import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BackupService } from "../../src/main/services/backup-service";

const roots: string[] = [];

async function fixture(): Promise<{ root: string; runtime: string }> {
  const root = await mkdtemp(join(tmpdir(), "stellar-backup-"));
  roots.push(root);
  await mkdir(join(root, "source", "_data"), { recursive: true });
  await writeFile(join(root, "_config.yml"), "title: One\n");
  await writeFile(join(root, "_config.stellar.yml"), "logo:\n  title: One\n");
  await writeFile(join(root, "source", "_data", "widgets.yml"), "recent:\n  limit: 5\n");
  return { root, runtime: join(root, "html_control", ".runtime") };
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("BackupService", () => {
  it("creates one snapshot containing all three configuration files", async () => {
    const { root, runtime } = await fixture();
    const service = new BackupService(root, runtime);
    const entry = await service.create();

    expect(entry.automatic).toBe(true);
    expect(await service.list()).toHaveLength(1);
    expect(await readFile(join(runtime, "backups", entry.id, "_config.yml"), "utf8")).toContain("One");
    expect(
      await readFile(join(runtime, "backups", entry.id, "source", "_data", "widgets.yml"), "utf8"),
    ).toContain("limit: 5");
  });

  it("keeps named backups when automatic retention is enforced", async () => {
    const { root, runtime } = await fixture();
    const service = new BackupService(root, runtime, 2);
    await service.create("里程碑");
    await service.create();
    await new Promise((resolve) => setTimeout(resolve, 2));
    await service.create();
    await new Promise((resolve) => setTimeout(resolve, 2));
    await service.create();

    const entries = await service.list();
    expect(entries.filter((entry) => entry.automatic)).toHaveLength(2);
    expect(entries.some((entry) => entry.name === "里程碑")).toBe(true);
  });

  it("backs up the current state before restoring a snapshot", async () => {
    const { root, runtime } = await fixture();
    const service = new BackupService(root, runtime);
    const original = await service.create("原始");
    await writeFile(join(root, "_config.yml"), "title: Changed\n");

    await service.restore(original.id);

    expect(await readFile(join(root, "_config.yml"), "utf8")).toContain("One");
    expect((await service.list()).some((entry) => entry.name === "恢复前自动备份")).toBe(true);
  });
});
