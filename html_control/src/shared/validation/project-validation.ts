import type { ValidationIssue, ValidationResult } from "../types";

export interface LocalResourcePath {
  yamlPath: string[];
  relativePath: string;
}

export function collectLocalResourcePaths(values: unknown, root = "/"): LocalResourcePath[] {
  const resources: LocalResourcePath[] = [];
  const normalizedRoot = root.startsWith("/") ? root : `/${root}`;
  const walk = (value: unknown, path: string[]): void => {
    if (Array.isArray(value)) return value.forEach((item, index) => walk(item, [...path, String(index)]));
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) walk(child, [...path, key]);
      return;
    }
    if (typeof value !== "string" || !value.startsWith("/") || !/\.(?:png|jpe?g|webp|gif|svg|ico|avif|css|js|woff2?|ttf|otf)(?:[?#].*)?$/i.test(value)) return;
    const clean = value.split(/[?#]/, 1)[0].replace(/\\/g, "/");
    const relative = (clean.startsWith(normalizedRoot) ? clean.slice(normalizedRoot.length) : clean.slice(1));
    if (relative.split("/").includes("..")) throw new Error(`${path.join(".")} 的本地资源路径越界`);
    resources.push({ yamlPath: path, relativePath: relative.replace(/^\/+/, "") });
  };
  walk(values, []);
  return resources;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

export function validateProjectConfig(
  hexo: Record<string, unknown>,
  stellar: Record<string, unknown>,
  widgets: Record<string, unknown>,
  hasServerMathjax: boolean,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const root = String(hexo.root ?? "");
  if (!root.startsWith("/") || !root.endsWith("/")) {
    issues.push({ level: "error", file: "hexo", path: ["root"], message: "站点 root 必须以 / 开始并以 / 结束" });
  }

  const siteTree = record(stellar.site_tree);
  const widgetNames = new Set(Object.keys(widgets));
  for (const [pageType, pageValue] of Object.entries(siteTree)) {
    const page = record(pageValue);
    for (const side of ["leftbar", "rightbar"] as const) {
      for (const widget of list(page[side])) {
        if (!widgetNames.has(widget)) {
          issues.push({
            level: "error",
            file: "stellar",
            path: ["site_tree", pageType, side],
            message: `侧边栏组件 ${widget} 不存在`,
          });
        }
      }
    }
  }

  const indexBlog = record(siteTree.index_blog);
  const navTabs = record(indexBlog.nav_tabs);
  const generated = new Set(["/", "/categories/", "/tags/", "/archives/"]);
  for (const [title, value] of Object.entries(navTabs)) {
    if (generated.has(String(value))) {
      issues.push({
        level: "error",
        file: "stellar",
        path: ["site_tree", "index_blog", "nav_tabs", title],
        message: `${title} 已由 Stellar 自动导航生成，请删除重复项`,
      });
    }
  }

  const plugins = record(stellar.plugins);
  const browserMathjax = record(plugins.mathjax).enable === true;
  const browserKatex = record(plugins.katex).enable === true;
  if (hasServerMathjax && (browserMathjax || browserKatex)) {
    issues.push({
      level: "error",
      file: "stellar",
      path: ["plugins", browserMathjax ? "mathjax" : "katex", "enable"],
      message: "服务端和浏览器端公式渲染不能同时启用",
    });
  }

  const comments = record(stellar.comments);
  if (comments.service === "giscus") {
    const giscus = record(comments.giscus);
    for (const field of ["data-repo", "data-repo-id", "data-category", "data-category-id"]) {
      if (!String(giscus[field] ?? "").trim()) {
        issues.push({
          level: "error",
          file: "stellar",
          path: ["comments", "giscus", field],
          message: `Giscus 缺少必填参数 ${field}`,
        });
      }
    }
  }

  return { valid: issues.every((issue) => issue.level !== "error"), issues };
}
