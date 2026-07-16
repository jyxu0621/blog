import { isMap, parseDocument, type Document, type ParsedNode } from "yaml";
import { buildSchema, getIn } from "../../../shared/schema/stellar-schema";
import type { ConfigDocumentSnapshot, EffectiveField } from "../../../shared/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function merge(defaults: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    result[key] = isRecord(value) && isRecord(result[key])
      ? merge(result[key] as Record<string, unknown>, value)
      : value;
  }
  return result;
}

function parsed(source: string): Document.Parsed {
  const document = parseDocument(source);
  if (document.errors.length) {
    const error = document.errors[0];
    const position = error.linePos?.[0];
    throw new Error(`${position ? `第 ${position.line} 行，第 ${position.col} 列：` : ""}${error.message}`);
  }
  return document;
}

function hasIn(values: Record<string, unknown>, path: string[]): boolean {
  let current: unknown = values;
  for (const key of path) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, key)) return false;
    current = current[key];
  }
  return true;
}

function removeEmptyParents(document: Document.Parsed, path: string[]): void {
  for (let length = path.length; length > 0; length -= 1) {
    const parentPath = path.slice(0, length);
    const node = document.getIn(parentPath, true) as ParsedNode | undefined;
    if (isMap(node) && node.items.length === 0) document.deleteIn(parentPath);
    else break;
  }
}

export function updateDraftValue(source: string, path: string[], value: unknown): string {
  const document = parsed(source);
  document.setIn(path, value);
  return String(document);
}

export function removeDraftValue(source: string, path: string[]): string {
  const document = parsed(source);
  const leadingComments = source.match(/^(?:(?:[ \t]*#.*)?\r?\n)+/)?.[0] ?? "";
  document.deleteIn(path);
  removeEmptyParents(document, path.slice(0, -1));
  let next = String(document);
  if (leadingComments.trim() && !next.includes(leadingComments.trim())) next = `${leadingComments}${next}`;
  return next;
}

export function createFields(snapshot: ConfigDocumentSnapshot, draftSource: string): EffectiveField[] {
  const document = parsed(draftSource);
  const values = (document.toJS() ?? {}) as Record<string, unknown>;
  const effective = merge(snapshot.defaults, values);
  return buildSchema(snapshot.file, effective).map((schema) => {
    const override = hasIn(values, schema.path);
    return {
      schema,
      defaultValue: getIn(snapshot.defaults, schema.path),
      overrideValue: override ? getIn(values, schema.path) : undefined,
      effectiveValue: getIn(effective, schema.path),
      source: override ? "override" : "default",
      dirty: JSON.stringify(getIn(values, schema.path)) !== JSON.stringify(getIn(snapshot.values, schema.path)),
      errors: [],
    };
  });
}
