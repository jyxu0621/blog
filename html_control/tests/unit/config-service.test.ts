import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigConflictError, ConfigService } from "../../src/main/services/config-service";

const roots: string[] = [];

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "stellar-control-"));
  roots.push(root);
  await mkdir(join(root, "node_modules", "hexo-theme-stellar", "_data"), { recursive: true });
  await mkdir(join(root, "source", "_data"), { recursive: true });
  await writeFile(
    join(root, "node_modules", "hexo-theme-stellar", "_config.yml"),
    "logo:\n  title: Default title\nstyle:\n  prefers_theme: auto\n",
    "utf8",
  );
  await writeFile(
    join(root, "node_modules", "hexo-theme-stellar", "_data", "widgets.yml"),
    "recent:\n  layout: recent\n  limit: 5\n",
    "utf8",
  );
  await writeFile(join(root, "_config.yml"), "title: Test\n", "utf8");
  await writeFile(
    join(root, "_config.stellar.yml"),
    "# keep this comment\nlogo:\n  title: Custom title\n",
    "utf8",
  );
  await writeFile(join(root, "source", "_data", "widgets.yml"), "recent:\n  limit: 8\n", "utf8");
  return root;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("ConfigService", () => {
  it("merges defaults with overrides without changing the source", async () => {
    const root = await fixture();
    const service = new ConfigService(root);
    const snapshot = await service.read("stellar");

    expect(snapshot.effective).toMatchObject({
      logo: { title: "Custom title" },
      style: { prefers_theme: "auto" },
    });
    expect(snapshot.source).toContain("# keep this comment");
  });

  it("does not write when source is unchanged", async () => {
    const root = await fixture();
    const service = new ConfigService(root);
    const snapshot = await service.read("stellar");
    const result = await service.save({ file: "stellar", baseHash: snapshot.hash, source: snapshot.source });

    expect(result.changed).toBe(false);
    expect(await readFile(join(root, "_config.stellar.yml"), "utf8")).toBe(snapshot.source);
  });

  it("rejects an overwrite after an external file change", async () => {
    const root = await fixture();
    const service = new ConfigService(root);
    const snapshot = await service.read("stellar");
    await writeFile(join(root, "_config.stellar.yml"), "logo:\n  title: External\n", "utf8");

    await expect(
      service.save({ file: "stellar", baseHash: snapshot.hash, source: "logo:\n  title: Mine\n" }),
    ).rejects.toBeInstanceOf(ConfigConflictError);
  });

  it("removes an override while preserving unrelated comments", async () => {
    const root = await fixture();
    const service = new ConfigService(root);
    const snapshot = await service.read("stellar");
    const result = await service.restoreDefault({ file: "stellar", baseHash: snapshot.hash, path: ["logo", "title"] });
    const source = await readFile(join(root, "_config.stellar.yml"), "utf8");

    expect(result.changed).toBe(true);
    expect(source).toContain("# keep this comment");
    expect(source).not.toContain("Custom title");
  });

  it("checks every hash before a multi-file save and creates only one backup", async () => {
    const root = await fixture();
    let backups = 0;
    const service = new ConfigService(root, async () => `backup-${++backups}`);
    const stellar = await service.read("stellar");
    const widgets = await service.read("widgets");
    await writeFile(join(root, "source", "_data", "widgets.yml"), "recent:\n  limit: 9\n", "utf8");

    await expect(service.saveMany([
      { file: "stellar", baseHash: stellar.hash, source: "logo:\n  title: New\n" },
      { file: "widgets", baseHash: widgets.hash, source: "recent:\n  limit: 10\n" },
    ])).rejects.toBeInstanceOf(ConfigConflictError);
    expect(await readFile(join(root, "_config.stellar.yml"), "utf8")).toBe(stellar.source);
    expect(backups).toBe(0);

    const latestWidgets = await service.read("widgets");
    const results = await service.saveMany([
      { file: "stellar", baseHash: stellar.hash, source: "logo:\n  title: New\n" },
      { file: "widgets", baseHash: latestWidgets.hash, source: "recent:\n  limit: 10\n" },
    ]);
    expect(results.every((result) => result.changed)).toBe(true);
    expect(new Set(results.map((result) => result.backupId))).toEqual(new Set(["backup-1"]));
    expect(backups).toBe(1);
  });
});
