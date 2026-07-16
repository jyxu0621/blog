import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigService } from "../../src/main/services/config-service";
import { CONFIG_PATHS, loadProjectSnapshot } from "../../src/main/services/project-service";
import { buildSchema } from "../../src/shared/schema/stellar-schema";
import type { ConfigFileId } from "../../src/shared/types";

const projectRoot = "F:\\blog-site";
const fileIds: ConfigFileId[] = ["hexo", "stellar", "widgets"];
const digest = (source: string) => createHash("sha256").update(source).digest("hex");

describe("真实博客只读回归", () => {
  it("读取实际安装版本，而不是 package.json 中的范围字符串", async () => {
    const snapshot = await loadProjectSnapshot(projectRoot);
    const hexoPackage = JSON.parse(await readFile(join(projectRoot, "node_modules", "hexo", "package.json"), "utf8"));
    const stellarPackage = JSON.parse(await readFile(join(projectRoot, "node_modules", "hexo-theme-stellar", "package.json"), "utf8"));

    expect(snapshot.hexoVersion).toBe(hexoPackage.version);
    expect(snapshot.stellarVersion).toBe(stellarPackage.version);
    expect(snapshot.compatible).toBe(true);
  });

  it("完整读取三个配置文件且不产生写入", async () => {
    const before = Object.fromEntries(await Promise.all(fileIds.map(async (file) => {
      const source = await readFile(join(projectRoot, CONFIG_PATHS[file]), "utf8");
      return [file, digest(source)];
    })));
    const service = new ConfigService(projectRoot);

    const documents = await Promise.all(fileIds.map((file) => service.read(file)));
    expect(documents.every((document) => document.source.length > 0)).toBe(true);
    expect(buildSchema("stellar", documents[1].effective).length).toBeGreaterThan(300);

    const after = Object.fromEntries(await Promise.all(fileIds.map(async (file) => {
      const source = await readFile(join(projectRoot, CONFIG_PATHS[file]), "utf8");
      return [file, digest(source)];
    })));
    expect(after).toEqual(before);
  });
});
