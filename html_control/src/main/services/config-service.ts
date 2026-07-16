import { createHash } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTwoFilesPatch } from "diff";
import { isMap, parseDocument, type Document, type ParsedNode } from "yaml";
import type {
  ConfigDocumentSnapshot,
  ConfigFileId,
  RestoreDefaultRequest,
  SaveRequest,
  SaveResult,
} from "../../shared/types";
import { CONFIG_PATHS } from "./project-service";

export class ConfigConflictError extends Error {
  constructor() {
    super("配置文件已被其他程序修改，请重新加载后再保存");
    this.name = "ConfigConflictError";
  }
}

function hash(source: string): string {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function deepMerge(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    result[key] = isRecord(value) && isRecord(result[key])
      ? deepMerge(result[key] as Record<string, unknown>, value)
      : value;
  }
  return result;
}

function assertValid(document: Document.Parsed): void {
  if (document.errors.length > 0) {
    const first = document.errors[0];
    const position = first.linePos?.[0];
    const where = position ? `（第 ${position.line} 行，第 ${position.col} 列）` : "";
    throw new Error(`YAML 语法错误${where}：${first.message}`);
  }
}

function asRecord(document: Document.Parsed): Record<string, unknown> {
  return (document.toJS() ?? {}) as Record<string, unknown>;
}

export class ConfigService {
  constructor(
    private readonly root: string,
    private readonly beforeWrite?: () => Promise<string | undefined>,
  ) {}

  pathFor(file: ConfigFileId): string {
    return join(this.root, CONFIG_PATHS[file]);
  }

  private defaultPathFor(file: ConfigFileId): string | null {
    if (file === "stellar") return join(this.root, "node_modules", "hexo-theme-stellar", "_config.yml");
    if (file === "widgets") {
      return join(this.root, "node_modules", "hexo-theme-stellar", "_data", "widgets.yml");
    }
    return null;
  }

  async read(file: ConfigFileId): Promise<ConfigDocumentSnapshot> {
    const path = this.pathFor(file);
    const source = await readFile(path, "utf8");
    const document = parseDocument(source);
    assertValid(document);
    const defaultPath = this.defaultPathFor(file);
    let defaults: Record<string, unknown> = {};
    if (defaultPath) {
      const defaultDocument = parseDocument(await readFile(defaultPath, "utf8"));
      assertValid(defaultDocument);
      defaults = asRecord(defaultDocument);
    }
    const values = asRecord(document);
    return {
      file,
      path,
      hash: hash(source),
      source,
      values,
      defaults,
      effective: deepMerge(defaults, values),
    };
  }

  async save(request: SaveRequest): Promise<SaveResult> {
    const path = this.pathFor(request.file);
    const current = await readFile(path, "utf8");
    if (hash(current) !== request.baseHash) throw new ConfigConflictError();
    const document = parseDocument(request.source);
    assertValid(document);
    if (current === request.source) {
      return { changed: false, hash: request.baseHash, diff: "" };
    }
    const backupId = await this.beforeWrite?.();
    const temporary = `${path}.stellar-control.tmp`;
    await writeFile(temporary, request.source, "utf8");
    try {
      assertValid(parseDocument(await readFile(temporary, "utf8")));
      await rename(temporary, path);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
    return {
      changed: true,
      hash: hash(request.source),
      backupId,
      diff: createTwoFilesPatch(path, path, current, request.source, "保存前", "保存后"),
    };
  }

  async saveMany(requests: SaveRequest[]): Promise<SaveResult[]> {
    const unique = new Set(requests.map((request) => request.file));
    if (unique.size !== requests.length) throw new Error("同一配置文件不能重复保存");

    const prepared = await Promise.all(requests.map(async (request) => {
      const path = this.pathFor(request.file);
      const current = await readFile(path, "utf8");
      if (hash(current) !== request.baseHash) throw new ConfigConflictError();
      assertValid(parseDocument(request.source));
      return { request, path, current, temporary: `${path}.stellar-control.tmp` };
    }));
    const changed = prepared.filter((entry) => entry.current !== entry.request.source);
    if (changed.length === 0) {
      return prepared.map((entry) => ({ changed: false, hash: entry.request.baseHash, diff: "" }));
    }

    const backupId = await this.beforeWrite?.();
    try {
      await Promise.all(changed.map(async (entry) => {
        await writeFile(entry.temporary, entry.request.source, "utf8");
        assertValid(parseDocument(await readFile(entry.temporary, "utf8")));
      }));
      for (const entry of changed) await rename(entry.temporary, entry.path);
    } catch (error) {
      await Promise.all(changed.map(async (entry) => {
        await unlink(entry.temporary).catch(() => undefined);
        await writeFile(entry.path, entry.current, "utf8").catch(() => undefined);
      }));
      throw error;
    }

    return prepared.map((entry) => entry.current === entry.request.source
      ? { changed: false, hash: entry.request.baseHash, backupId, diff: "" }
      : {
        changed: true,
        hash: hash(entry.request.source),
        backupId,
        diff: createTwoFilesPatch(entry.path, entry.path, entry.current, entry.request.source, "保存前", "保存后"),
      });
  }

  async restoreDefault(request: RestoreDefaultRequest): Promise<SaveResult> {
    const snapshot = await this.read(request.file);
    if (snapshot.hash !== request.baseHash) throw new ConfigConflictError();
    const document = parseDocument(snapshot.source);
    assertValid(document);
    const leadingComments = snapshot.source.match(/^(?:(?:[ \t]*#.*)?\r?\n)+/)?.[0] ?? "";
    document.deleteIn(request.path);
    this.removeEmptyParents(document, request.path.slice(0, -1));
    let source = String(document);
    if (leadingComments.trim() && !source.includes(leadingComments.trim())) source = `${leadingComments}${source}`;
    return this.save({ file: request.file, baseHash: request.baseHash, source });
  }

  private removeEmptyParents(document: Document.Parsed, path: string[]): void {
    for (let length = path.length; length > 0; length -= 1) {
      const parentPath = path.slice(0, length);
      const node = document.getIn(parentPath, true) as ParsedNode | undefined;
      if (isMap(node) && node.items.length === 0) document.deleteIn(parentPath);
      else break;
    }
  }
}
