import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ConfigFileId, ConfigFileState, ProjectSnapshot } from "../../shared/types";

export const CONFIG_PATHS: Record<ConfigFileId, string> = {
  hexo: "_config.yml",
  stellar: "_config.stellar.yml",
  widgets: join("source", "_data", "widgets.yml"),
};

export function resolveDefaultBlogRoot(controlRoot: string): string {
  return dirname(resolve(controlRoot));
}

export function resolvePortableBlogRoot(portableDirectory: string): string {
  return resolve(portableDirectory, "..", "..");
}

export function resolvePackagedBlogRoot(executablePath: string): string {
  return resolve(dirname(executablePath), "..", "..", "..");
}

export function resolvePreloadPath(mainDirectory: string): string {
  return resolve(mainDirectory, "..", "preload", "index.cjs");
}

export async function validateBlogRoot(root: string): Promise<void> {
  const required = [
    "package.json",
    "_config.yml",
    "_config.stellar.yml",
    join("node_modules", "hexo-theme-stellar", "_config.yml"),
  ];
  try {
    await Promise.all(required.map((item) => access(join(root, item))));
  } catch {
    throw new Error(`不是可识别的 Hexo Stellar 项目：${root}`);
  }
}

async function fileState(root: string, id: ConfigFileId): Promise<ConfigFileState> {
  const path = join(root, CONFIG_PATHS[id]);
  try {
    const [source, info] = await Promise.all([readFile(path), stat(path)]);
    return {
      id,
      path,
      exists: true,
      hash: createHash("sha256").update(source).digest("hex"),
      modifiedAt: info.mtime.toISOString(),
    };
  } catch {
    return { id, path, exists: false, hash: "", modifiedAt: "" };
  }
}

export async function loadProjectSnapshot(root: string): Promise<ProjectSnapshot> {
  await validateBlogRoot(root);
  const [projectPackage, themePackage, files] = await Promise.all([
    readFile(join(root, "package.json"), "utf8").then(JSON.parse),
    readFile(join(root, "node_modules", "hexo-theme-stellar", "package.json"), "utf8").then(JSON.parse),
    Promise.all((Object.keys(CONFIG_PATHS) as ConfigFileId[]).map((id) => fileState(root, id))),
  ]);
  const stellarVersion = String(themePackage.version ?? "unknown");
  return {
    root,
    hexoVersion: String(projectPackage.hexo?.version ?? projectPackage.dependencies?.hexo ?? "unknown"),
    stellarVersion,
    compatible: stellarVersion === "1.33.1",
    files,
  };
}
