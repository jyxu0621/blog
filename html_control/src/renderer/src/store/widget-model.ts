import { isMap, isScalar, isSeq, parseDocument, type ParsedNode } from "yaml";

function parse(source: string) {
  const document = parseDocument(source);
  if (document.errors.length) throw document.errors[0];
  return document;
}

function sidebarContains(value: unknown, widgetName: string): boolean {
  if (isSeq(value)) return value.items.some((item) => isScalar(item) && item.value === widgetName);
  if (isScalar(value)) return sidebarContains(value.value, widgetName);
  if (Array.isArray(value)) return value.some((item) => item === widgetName);
  if (typeof value !== "string") return false;
  return value.split(",").map((item) => item.trim()).includes(widgetName);
}

export function reorderSidebar(value: string, from: number, to: number): string {
  const items = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items.join(", ");
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  return items.join(", ");
}

export function findWidgetReferences(stellarSource: string, widgetName: string): string[] {
  const document = parse(stellarSource);
  const siteTree = document.getIn(["site_tree"], true) as ParsedNode | undefined;
  if (!isMap(siteTree)) return [];

  const references: string[] = [];
  for (const pagePair of siteTree.items) {
    const pageName = isScalar(pagePair.key) ? String(pagePair.key.value) : String(pagePair.key);
    if (!isMap(pagePair.value)) continue;

    for (const side of ["leftbar", "rightbar"] as const) {
      const value = document.getIn(["site_tree", pageName, side], true);
      if (sidebarContains(value, widgetName)) references.push(`site_tree.${pageName}.${side}`);
    }
  }
  return references;
}

function renameSidebarNode(node: ParsedNode | undefined, oldName: string, newName: string): void {
  if (isSeq(node)) {
    for (const item of node.items) {
      if (isScalar(item) && item.value === oldName) item.value = newName;
    }
    return;
  }

  if (isScalar(node) && typeof node.value === "string") {
    node.value = node.value
      .split(",")
      .map((item) => item.trim() === oldName ? newName : item.trim())
      .join(", ");
  }
}

export function renameWidget(
  widgetsSource: string,
  stellarSource: string,
  oldName: string,
  newName: string,
): { widgets: string; stellar: string } {
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("组件名称不能为空");

  const widgetsDocument = parse(widgetsSource);
  const widgetsRoot = widgetsDocument.contents;
  if (!isMap(widgetsRoot)) throw new Error("widgets.yml 必须是键值对象");
  if (widgetsDocument.hasIn([cleanName])) throw new Error(`组件 ${cleanName} 已存在`);

  const widgetPair = widgetsRoot.items.find((pair) => isScalar(pair.key) && pair.key.value === oldName);
  if (!widgetPair || !isScalar(widgetPair.key)) throw new Error(`找不到组件 ${oldName}`);
  widgetPair.key.value = cleanName;

  const stellarDocument = parse(stellarSource);
  const siteTree = stellarDocument.getIn(["site_tree"], true) as ParsedNode | undefined;
  if (isMap(siteTree)) {
    for (const pagePair of siteTree.items) {
      const pageName = isScalar(pagePair.key) ? String(pagePair.key.value) : String(pagePair.key);
      renameSidebarNode(
        stellarDocument.getIn(["site_tree", pageName, "leftbar"], true) as ParsedNode | undefined,
        oldName,
        cleanName,
      );
      renameSidebarNode(
        stellarDocument.getIn(["site_tree", pageName, "rightbar"], true) as ParsedNode | undefined,
        oldName,
        cleanName,
      );
    }
  }

  return { widgets: String(widgetsDocument), stellar: String(stellarDocument) };
}
