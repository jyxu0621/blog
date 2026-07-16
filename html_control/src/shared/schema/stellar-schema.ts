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
  timezone: "时区",
  favicon: "浏览器图标",
  repo: "代码仓库",
  homepage: "主题主页",
  version: "版本",
  originalHost: "原始站点域名",
  officialHosts: "允许的正式域名",
  twitter_id: "Twitter / X 账号",
  links: "关联链接",
  base_dir: "页面目录",
  menu_id: "对应导航项",
  nav_tabs: "页面顶部导航",
  auto_excerpt: "自动生成摘要",
  per_page: "每页数量",
  order_by: "排序方式",
  license: "文章许可协议",
  share: "分享按钮",
  indent: "正文首行缩进",
  cover_ratio: "文章封面比例",
  banner_ratio: "横幅图片比例",
  auto_banner: "自动使用横幅",
  related_posts: "相关文章",
  max_count: "最多显示数量",
  field: "搜索范围",
  path: "文件路径",
  skip_search: "不参与搜索的页面",
  appId: "应用 ID",
  apiKey: "API 密钥",
  indexName: "索引名称",
  comment_title: "评论区标题",
  lazyload: "滚动到评论区时再加载",
  custom_css: "评论区自定义样式",
  envId: "服务地址",
  serverURL: "服务端地址",
  commentCount: "显示评论数量",
  pageview: "显示浏览量",
  server: "服务端地址",
  site: "站点名称",
  darkMode: "深色模式",
  sitemap: "页脚站点地图",
  social: "页脚社交链接",
  layout: "组件类型",
  limit: "显示数量",
  amount: "标签数量",
  orderby: "排序依据",
  order: "排序方向",
  color: "颜色",
  show_count: "显示文章数量",
  list_number: "显示目录编号",
  min_depth: "最小标题层级",
  max_depth: "最大标题层级",
  fallback: "无目录时显示",
  collapse: "折叠目录",
  interactive: "允许点击交互",
  default_color: "默认颜色",
  border: "显示边框",
  prefix: "前缀符号",
  suffix: "后缀符号",
  fancybox: "点击放大图片",
  toast: "操作提示",
  ratio: "图片比例",
  size: "尺寸",
  loader: "加载方式",
  selector: "生效范围",
  distance: "动画移动距离",
  duration: "动画时长",
  interval: "动画间隔",
  scale: "动画缩放",
  key: "授权密钥",
  total_length: "摘要长度",
  typewriter: "打字机效果",
  summary_directly: "直接显示摘要",
  hide_shuttle: "隐藏切换按钮",
  summary_toggle: "允许展开摘要",
  introduce: "简介",
  button: "按钮文字",
  v3: "使用 MathJax 3",
  style_optimization: "样式优化",
  default_text: "复制前提示",
  success_text: "复制成功提示",
  prefers_theme: "默认明暗模式",
  smooth_scroll: "平滑滚动",
  "text-align": "正文对齐方式",
  animate: "头像动画",
  background: "背景",
  scrollbar: "代码块滚动条",
  highlightjs_theme: "代码高亮主题",
  start: "渐变起始颜色",
  prev: "上一页按钮",
  next: "下一页按钮",
  blur: "模糊程度",
  loading: "加载中图片",
  image_onerror: "图片加载失败占位图",
  ghapi: "GitHub API 地址",
  ghraw: "GitHub 原始文件地址",
  gist: "Gist API 地址",
  ghcard: "GitHub 卡片服务地址",
  override_pretty_urls: "修正 Hexo 链接格式",
  source_dir: "文章源文件目录",
  public_dir: "生成文件目录",
  permalink: "文章链接格式",
  syntax_highlighter: "代码高亮工具",
  line_number: "显示代码行号",
  render_drafts: "生成草稿",
  post_asset_folder: "文章资源文件夹",
  default_layout: "默认文章类型",
};

const FIELD_META: Record<string, { label: string; description: string }> = {
  "hexo:title": { label: "网站名称", description: "显示在浏览器标题、侧边栏和搜索结果中的博客名称。" },
  "hexo:subtitle": { label: "网站副标题", description: "对网站名称的简短补充；留空即可不显示。" },
  "hexo:description": { label: "网站介绍", description: "用一两句话说明博客内容，也会提供给搜索引擎。" },
  "hexo:keywords": { label: "网站关键词", description: "用于概括博客主题，多个关键词可用英文逗号分隔。" },
  "hexo:author": { label: "作者名称", description: "博客作者或站点拥有者的显示名称。" },
  "hexo:language": { label: "界面语言", description: "主题默认文案使用的语言，例如 zh-CN。" },
  "hexo:timezone": { label: "网站时区", description: "文章日期采用的时区，中国大陆通常使用 Asia/Shanghai。" },
  "hexo:url": { label: "正式网站地址", description: "部署后的完整网址，用于生成规范链接和站点地图。" },
  "hexo:root": { label: "网站子路径", description: "网站部署在域名根目录时填 /；当前博客部署在子目录时通常填 /blog/。" },
  "hexo:theme": { label: "使用的主题", description: "当前应保持为 stellar。" },
  "stellar:logo.avatar": { label: "侧边栏头像", description: "左上角显示的头像，可填写图片链接，也可链接到关于页面。" },
  "stellar:logo.title": { label: "侧边栏标题", description: "左上角的站点标题，通常直接使用网站名称。" },
  "stellar:logo.subtitle": { label: "鼠标悬停副标题", description: "鼠标移到标题后切换的文字，可用“文字1 | 文字2”设置两段。" },
  "stellar:open_graph.enable": { label: "生成社交分享信息", description: "开启后，分享到微信、X 等平台时更容易显示标题、简介和图片。" },
  "stellar:open_graph.twitter_id": { label: "Twitter / X 账号", description: "可选；填写账号名，用于 X 平台的分享卡片。" },
  "stellar:menubar.columns": { label: "导航每行数量", description: "控制左侧主导航一行显示几个按钮。" },
  "stellar:menubar.items": { label: "主导航按钮", description: "设置导航按钮的标题、图标、颜色和跳转链接，可拖动排序。" },
  "stellar:search.service": { label: "站内搜索方式", description: "一般选择“本地搜索”；只有已配置 Algolia 时才切换。" },
  "stellar:search.local_search.field": { label: "搜索内容范围", description: "可搜索文章、独立页面或全部内容。" },
  "stellar:search.local_search.content": { label: "搜索文章正文", description: "开启后搜索更全面，但搜索索引会稍大。" },
  "stellar:search.local_search.skip_search": { label: "不参与搜索的页面", description: "填写不想被搜索到的页面路径，支持 * 通配符。" },
  "stellar:comments.service": { label: "评论服务", description: "选择博客使用的评论系统；不需要评论时选择“关闭”。" },
  "stellar:comments.lazyload": { label: "评论区延迟加载", description: "滚动到评论区附近时再加载，可提升文章首屏速度。" },
  "stellar:style.prefers_theme": { label: "默认明暗模式", description: "建议选择“跟随系统”，也可固定为浅色或深色。" },
  "stellar:style.color.theme": { label: "主题主色", description: "用于按钮、高亮和主要装饰元素。" },
  "stellar:style.color.accent": { label: "强调色", description: "用于需要额外强调的链接或状态。" },
  "stellar:style.font-size.root": { label: "界面基础字号", description: "影响整个网站的整体文字大小。" },
  "stellar:style.font-size.body": { label: "正文字号", description: "文章正文的文字大小。" },
  "stellar:style.font-size.codeblock": { label: "代码块字号", description: "代码块中的文字大小。" },
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
      label: FIELD_META[key]?.label ?? KEY_LABELS[path.at(-1) ?? ""] ?? `高级参数（${path.at(-1) ?? top}）`,
      description: FIELD_META[key]?.description ?? group.description,
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
