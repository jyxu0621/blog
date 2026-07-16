import type { ConfigFileId, FieldSchema, FieldType } from "../types";

const DOC_ROOT = "https://xaoxuu.com/wiki/stellar/";

const GROUPS: Record<string, { label: string; description: string; helpUrl: string }> = {
  stellar: { label: "主题信息", description: "Stellar 版本、主页与资源入口", helpUrl: DOC_ROOT },
  preconnect: { label: "预连接", description: "提前连接外部资源域名", helpUrl: `${DOC_ROOT}advanced-settings/` },
  inject: { label: "资源注入", description: "向页面头部或脚本区注入资源", helpUrl: `${DOC_ROOT}advanced-settings/` },
  canonical: { label: "SEO 与主站", description: "搜索引擎 Canonical、主站和备用站配置", helpUrl: `${DOC_ROOT}seo-settings/` },
  open_graph: { label: "Open Graph", description: "社交分享元数据", helpUrl: `${DOC_ROOT}theme-settings/` },
  structured_data: { label: "结构化数据", description: "搜索引擎结构化数据链接", helpUrl: `${DOC_ROOT}theme-settings/` },
  logo: { label: "Logo 与品牌", description: "头像、标题和副标题", helpUrl: `${DOC_ROOT}sidebar/` },
  menubar: { label: "主导航", description: "左侧主导航按钮", helpUrl: `${DOC_ROOT}sidebar/` },
  site_tree: { label: "站点结构", description: "不同页面的菜单和左右侧栏", helpUrl: `${DOC_ROOT}widgets/` },
  notebook: { label: "笔记本默认值", description: "笔记页面的全局默认行为", helpUrl: `${DOC_ROOT}notebooks/` },
  article: { label: "文章默认值", description: "文章摘要、封面、许可和分享", helpUrl: `${DOC_ROOT}articles/` },
  search: { label: "站内搜索", description: "本地搜索或 Algolia", helpUrl: `${DOC_ROOT}sidebar/` },
  comments: { label: "评论系统", description: "Giscus 等评论服务", helpUrl: `${DOC_ROOT}comments/` },
  footer: { label: "页脚", description: "社交链接、站点地图和版权", helpUrl: `${DOC_ROOT}sidebar/` },
  tag_plugins: { label: "标签组件", description: "Stellar 标签组件默认行为", helpUrl: `${DOC_ROOT}tag-plugins/` },
  dependencies: { label: "前端依赖", description: "主题运行依赖资源", helpUrl: `${DOC_ROOT}advanced-settings/` },
  data_services: { label: "数据服务", description: "GitHub、动态和远端数据接口", helpUrl: `${DOC_ROOT}tag-plugins/` },
  plugins: { label: "功能插件", description: "预加载、图片、公式和代码复制", helpUrl: `${DOC_ROOT}advanced-settings/` },
  style: { label: "外观样式", description: "颜色、字体、背景、圆角和动画", helpUrl: `${DOC_ROOT}advanced-settings/` },
  default: { label: "默认资源", description: "默认头像、封面、图片和加载资源", helpUrl: `${DOC_ROOT}advanced-settings/` },
  api_host: { label: "API Host", description: "GitHub 和 Gist API 主机", helpUrl: `${DOC_ROOT}advanced-settings/` },
  system: { label: "系统选项", description: "主题内部兼容选项", helpUrl: `${DOC_ROOT}advanced-settings/` },
  hexo: { label: "Hexo 高级设置", description: "站点生成、路径、Feed 和公式", helpUrl: "https://hexo.io/zh-cn/docs/configuration" },
  widgets: { label: "侧边栏组件库", description: "可复用的侧边栏组件", helpUrl: `${DOC_ROOT}widgets/` },
};

const KEY_LABELS: Record<string, string> = {
  enable: "启用",
  title: "标题",
  subtitle: "副标题",
  description: "介绍",
  author: "作者",
  language: "语言",
  keywords: "关键词",
  avatar: "头像",
  url: "链接",
  root: "根路径",
  theme: "主题",
  service: "服务",
  columns: "列数",
  items: "项目",
  leftbar: "左侧栏",
  rightbar: "右侧栏",
  content: "内容",
};

const CRITICAL = new Set([
  "hexo:url",
  "hexo:root",
  "hexo:theme",
  "hexo:source_dir",
  "hexo:public_dir",
  "stellar:plugins.mathjax.enable",
  "stellar:plugins.katex.enable",
]);

const SELECTS: Record<string, Array<{ label: string; value: unknown }>> = {
  "stellar:style.prefers_theme": [
    { label: "跟随系统", value: "auto" },
    { label: "浅色", value: "light" },
    { label: "深色", value: "dark" },
  ],
  "stellar:search.service": [
    { label: "本地搜索", value: "local_search" },
    { label: "Algolia", value: "algolia_search" },
  ],
  "stellar:comments.service": [
    { label: "关闭", value: false },
    ...["beaudar", "utterances", "giscus", "twikoo", "waline", "artalk"].map((value) => ({ label: value, value })),
  ],
};

function inferType(value: unknown, key: string): FieldType {
  if (SELECTS[key]) return "select";
  if (Array.isArray(value)) return "array";
  if (value !== null && typeof value === "object") return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

export function buildSchema(file: ConfigFileId, values: Record<string, unknown>): FieldSchema[] {
  const fields: FieldSchema[] = [];
  const walk = (value: unknown, path: string[]): void => {
    const key = `${file}:${path.join(".")}`;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        walk(childValue, [...path, childKey]);
      }
      return;
    }
    const top = path[0] ?? (file === "hexo" ? "hexo" : "widgets");
    const group = file === "hexo" ? GROUPS.hexo : file === "widgets" ? GROUPS.widgets : (GROUPS[top] ?? GROUPS.stellar);
    fields.push({
      file,
      path,
      label: KEY_LABELS[path.at(-1) ?? ""] ?? path.at(-1) ?? top,
      description: group.description,
      type: inferType(value, key),
      options: SELECTS[key],
      critical: CRITICAL.has(key),
      helpUrl: group.helpUrl,
      group: group.label,
    });
  };
  for (const [key, value] of Object.entries(values)) walk(value, [key]);
  return fields;
}

export function searchSchema(fields: FieldSchema[], query: string): FieldSchema[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return fields;
  return fields.filter((field) =>
    [field.label, field.description, field.group, field.path.join(".")]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalized),
  );
}

export function getIn(values: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, values);
}
