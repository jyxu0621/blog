# Stellar 本地主题控制台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:test-driven-development` for behavior changes and `superpowers:verification-before-completion` before completion claims.

**Goal:** 在 `F:\blog-site\html_control` 创建中文 Electron 桌面应用，可视化管理其父目录的 Hexo 8.1.2 与 Stellar 1.33.1 配置，并提供备份、验证、构建和应用内真实预览。

**Architecture:** `html_control` 是 `F:\blog-site` 仓库中的独立嵌套 npm 工程。Electron 主进程负责文件与 Hexo 子进程，preload 暴露固定 IPC，React 渲染进程使用 AdminLTE v4 提供结构化表单、高级 YAML、差异和预览界面。应用合并 Stellar 默认配置与三个用户配置文件，只写用户覆盖项。

**Tech Stack:** Electron、electron-vite、React、TypeScript、AdminLTE v4、React Router、Zustand、React Hook Form、`yaml`、CodeMirror 6、Bootstrap Icons、Vitest、React Testing Library、electron-builder。

## Global Constraints

- 目标系统为 Windows x64，产物为无需安装的 portable EXE。
- 控制台位置固定为 `F:\blog-site\html_control`，默认管理父目录 `F:\blog-site`。
- Stellar 配置 schema 固定支持 1.33.1；检测到其他版本时禁止结构化写入。
- 中文界面，跟随系统明暗模式。
- 不实现文章、草稿、Wiki 内容或媒体管理；这些继续由 HexoHub 完成。
- 不实现部署、Git 管理、任意终端、登录、权限、多用户、密钥加密、远程访问或自动更新。
- 不修改 `F:\blog`，不修改 `node_modules\hexo-theme-stellar`。
- 只执行预定义的验证、构建和预览命令。
- 测试写入仅使用临时夹具，不修改真实博客配置。
- 当前仓库存在用户文件 `agent.md`（未跟踪）；实施时不得覆盖、删除或擅自提交它。

---

## 1. 功能边界

控制台负责：

- 完整编辑站点、品牌、SEO、导航、页面结构、侧边栏组件、文章默认外观、搜索、评论、页脚、标签组件、插件、数据服务、外观、默认资源和 Hexo 高级配置。
- 显示默认值、用户覆盖值、最终生效值及本次修改状态。
- 保存前差异、哈希冲突检测、自动备份和恢复。
- YAML、跨文件引用和项目约束校验。
- 执行现有验证流水线，构建并启动应用内 Hexo 预览。

控制台不负责：

- 文章及媒体内容管理。
- Git 提交、推送、Actions 查询或博客部署。
- 任意命令输入。

## 2. 工程结构

在 `F:\blog-site\html_control` 创建：

```text
html_control/
├─ package.json
├─ package-lock.json
├─ electron.vite.config.ts
├─ electron-builder.yml
├─ tsconfig.json
├─ src/
│  ├─ main/
│  │  ├─ index.ts
│  │  └─ services/
│  │     ├─ project-service.ts
│  │     ├─ config-service.ts
│  │     ├─ backup-service.ts
│  │     ├─ validation-service.ts
│  │     └─ preview-service.ts
│  ├─ preload/
│  │  └─ index.ts
│  ├─ renderer/
│  │  ├─ index.html
│  │  └─ src/
│  │     ├─ App.tsx
│  │     ├─ routes/
│  │     ├─ components/
│  │     ├─ features/
│  │     └─ styles/
│  └─ shared/
│     ├─ types.ts
│     ├─ ipc.ts
│     ├─ schema/
│     └─ validation/
├─ tests/
│  ├─ fixtures/
│  ├─ unit/
│  ├─ component/
│  └─ integration/
└─ README.md
```

在仓库根 `.gitignore` 增加：

```gitignore
/html_control/node_modules/
/html_control/dist/
/html_control/out/
/html_control/release/
/html_control/.runtime/
/html_control/coverage/
/html_control/.tmp/
```

`html_control` 不加入根项目 npm workspace，不改变 Hexo 根项目安装和 CI 流程。

## 3. 配置来源与合并模型

读取：

1. `node_modules/hexo-theme-stellar/_config.yml`
2. `_config.yml`
3. `_config.stellar.yml`
4. `source/_data/widgets.yml`

核心类型：

```ts
type ConfigFileId = "hexo" | "stellar" | "widgets";

interface FieldSchema {
  file: ConfigFileId;
  path: string[];
  label: string;
  description: string;
  type: "string" | "number" | "boolean" | "select" | "array" | "object" | "yaml";
  options?: Array<{ label: string; value: unknown }>;
  critical?: boolean;
  helpUrl?: string;
}

interface EffectiveField {
  schema: FieldSchema;
  defaultValue: unknown;
  overrideValue: unknown;
  effectiveValue: unknown;
  source: "default" | "override";
  dirty: boolean;
  errors: string[];
}
```

要求：

- 使用 `yaml.parseDocument()` 维护 YAML Document，保存单字段修改时保留未知字段和注释。
- UI 展示最终生效值及来源。
- 修改默认字段时在覆盖文件中创建对应键。
- 恢复默认时删除覆盖键并清理无内容的空父对象。
- 无修改保存必须返回 no-op，不写文件、不改变换行或排序。
- 每次读取保存文件 SHA-256；保存请求携带基准哈希，外部文件变化时返回冲突而不是覆盖。

## 4. IPC 接口

共享类型包括：

- `ProjectSnapshot`
- `SaveRequest` / `SaveResult`
- `BackupEntry`
- `ValidationResult`
- `TaskEvent`
- `PreviewState`

`window.stellarControl` 固定暴露：

```ts
interface StellarControlApi {
  project: {
    load(): Promise<ProjectSnapshot>;
    selectDirectory(): Promise<ProjectSnapshot | null>;
  };
  config: {
    read(file: ConfigFileId): Promise<ConfigDocumentSnapshot>;
    save(request: SaveRequest): Promise<SaveResult>;
    restoreDefault(request: RestoreDefaultRequest): Promise<SaveResult>;
  };
  backup: {
    list(): Promise<BackupEntry[]>;
    create(name?: string): Promise<BackupEntry>;
    restore(id: string): Promise<ProjectSnapshot>;
  };
  validation: {
    run(): Promise<string>;
    cancel(taskId: string): Promise<void>;
  };
  preview: {
    start(): Promise<string>;
    stop(): Promise<void>;
    refresh(): Promise<PreviewState>;
  };
  tasks: {
    getHistory(): Promise<TaskEvent[]>;
    subscribe(listener: (event: TaskEvent) => void): () => void;
  };
}
```

禁止添加通用 `runCommand(string)` 和任意文件路径写入接口。

## 5. 页面设计

### 总览

- 博客目录、Hexo 版本、Stellar 版本。
- 三个配置文件的存在状态、哈希和修改状态。
- 最近备份、最近验证、预览进程状态。
- Stellar 非 1.33.1 时显示不兼容并禁用结构化保存。

### 站点与品牌

- `_config.yml` 的标题、副标题、介绍、关键词、作者和语言。
- Stellar 的 Logo、头像、favicon、Open Graph、结构化数据和注入资源。

### 导航与站点结构

- `menubar.columns` 和 `menubar.items` 的增删、编辑和拖拽排序。
- `site_tree` 全部页面类型的 `menu_id`、`base_dir`、`leftbar`、`rightbar` 等字段。
- 组件分配使用拖拽列表。
- 校验自动导航与手工导航重复。

### 侧边栏组件

支持 TOC、recent、related、linklist、markdown、tagcloud、ghuser、ghrepo、timeline。

- 新增、复制、重命名、删除和排序。
- 删除前搜索所有 `site_tree` 引用；存在引用则阻止并列出位置。

### 文章与笔记默认外观

编辑 `article`、`notebook` 的摘要、封面比例、缩进、许可证、分享和相关文章。

### 搜索、SEO、评论与页脚

- 本地搜索、Algolia。
- Canonical、Open Graph、结构化数据。
- Beaudar、Utterances、Giscus、Twikoo、Waline、Artalk。
- 页脚社交链接、站点地图和版权内容。

### 标签组件、插件与数据服务

覆盖 `tag_plugins`、`dependencies`、`data_services`、`plugins` 的完整 Stellar 1.33.1 默认树。开关关闭时保留参数但折叠显示，数组和对象使用可增删排序编辑器。

### 外观与资源

覆盖 `style`、`default`、`api_host`、`system`：字体、字号、颜色、圆角、代码块、动画、加载、背景、分页、默认图片和 API Host。

### Hexo 高级设置

覆盖 `_config.yml` 的 URL、root、permalink、目录、语法高亮、分页、Feed 和服务端 MathJax。

以下字段标记为 critical，但仍允许修改：`url`、`root`、`theme`、`source_dir`、`public_dir`、服务端/客户端公式渲染。

### 高级 YAML

- `_config.yml`、`_config.stellar.yml`、`widgets.yml` 三个 CodeMirror 标签页。
- YAML 与表单双向同步。
- 错误定位到行列。
- 保存前显示逐行差异。
- 支持中文字段名和 YAML 路径搜索。
- 配置组提供 Stellar 官方文档链接。

### 构建与预览

固定执行：

```text
npm run test:local-cover
npm run verify:site
npm run verify:advanced
npm run clean
npm run build
npm run verify:site -- --generated
npm run dev
```

- 每一步流式发送 stdout/stderr 和退出码。
- 失败时停止后续步骤。
- 从 4000 开始寻找空闲端口。
- 在应用内预览 `/blog/`，提供桌面、平板、手机宽度。
- 应用退出只终止本应用启动的 Hexo 进程树。

## 6. 保存与备份

- 未保存修改只存在 renderer 状态，顶部持续提示 dirty 状态。
- 保存前验证 YAML、字段类型和跨文件规则。
- 保存前校验基准哈希。
- 每次有效保存前在 `html_control/.runtime/backups/<timestamp>/` 创建三个配置文件的联合快照和 `metadata.json`。
- 自动备份只保留最近30组；命名备份不自动删除。
- 恢复前先创建当前状态备份。
- 使用同目录临时文件，重新解析通过后替换正式文件。

跨文件校验：

- `site_tree` 引用的 widget 必须存在。
- 自动导航不得在 `nav_tabs` 中重复配置。
- `/blog/` 根路径与内部链接需要一致。
- Giscus 等已选评论服务必须具备所需参数。
- 服务端 MathJax 与 Stellar 客户端 MathJax/KaTeX 不得同时启用。
- 本地封面和资源路径必须通过现有项目检查。

## 7. 实施任务

### Task 1：工程骨架与便携打包

- 先编写应用启动、preload API 存在和路径解析测试并确认失败。
- 创建独立 package、electron-vite 配置和 AdminLTE 中文壳。
- 实现开发启动、生产构建和 electron-builder portable x64 配置。
- 修改根 `.gitignore`。
- 验证单元测试、类型检查和 renderer 构建。

### Task 2：配置引擎

- 先为默认值合并、覆盖来源、恢复默认、no-op 保存、注释保留和哈希冲突写失败测试。
- 实现 ProjectService 和 ConfigService。
- 使用真实 Stellar 1.33.1 默认配置做只读兼容测试。

### Task 3：备份与恢复

- 先为联合快照、30组清理、命名备份保留和恢复前备份写失败测试。
- 实现 BackupService。
- 使用临时项目验证恢复可逆。

### Task 4：Stellar 1.33.1 schema

- 为每个主题顶层组存在性、字段路径覆盖和中文搜索写失败测试。
- 从固定版本默认配置递归生成基础类型 schema，并用人工元数据补充中文标签、说明、选项、critical 标志和官方链接。
- 保证所有顶层配置组可搜索定位。

### Task 5：结构化配置界面

- 先为动态字段、来源标记、dirty 状态、数组对象编辑、拖拽排序和条件显示写组件测试。
- 实现总览及全部配置路由。
- 使用通用 FieldRenderer，避免每个 YAML 字段重复编码。

### Task 6：侧边栏和导航专用编辑器

- 先为 widget CRUD、引用阻止、导航排序和侧栏分配写失败测试。
- 实现 MenubarEditor、SiteTreeEditor 和 WidgetLibraryEditor。
- 验证生成 YAML 可被 Hexo 解析。

### Task 7：高级 YAML、搜索与差异

- 先为 YAML 行列错误、表单源码同步、路径搜索和 diff 写失败测试。
- 集成 CodeMirror 6 YAML 模式。
- 保存确认页展示文件级和逐行差异。

### Task 8：校验、任务日志与预览

- 先为命令顺序、失败短路、取消、端口选择、日志顺序和进程清理写失败测试。
- 实现 ValidationService、PreviewService 和任务事件流。
- 实现应用内真实 Hexo 预览及三种宽度。

### Task 9：真实仓库只读回归与打包

- 对 `F:\blog-site` 执行只读加载，确认首次打开零差异。
- 运行应用全部测试、类型检查、构建和根博客验证流水线。
- 完成 Electron 启动与退出集成测试。
- 生成 `html_control/release/Stellar-Theme-Control-Portable-<version>.exe`。
- 编写中文 README，说明启动、保存、恢复、预览和 HexoHub 分工。

## 8. 验收标准

- 当前真实配置可完整读取，首次加载不写文件、不产生差异。
- 单独修改标题时只改变对应覆盖项。
- 恢复默认只删除该覆盖键。
- 注释、未知字段、中文文件和换行保持不变。
- 导航和侧边栏拖拽生成合法 YAML。
- 删除被引用 widget 会被阻止并列出引用位置。
- 三个配置文件可在表单和 YAML 间往返。
- 所有 Stellar 1.33.1 顶层配置组可搜索。
- 外部修改冲突不会被覆盖。
- 自动备份和恢复可逆。
- 现有博客验证和构建命令全部通过。
- 内嵌预览正确打开 `/blog/`。
- 关闭应用后不存在本应用遗留的 Hexo 进程。
- portable EXE 无需安装即可启动。

## 9. 完成前验证命令

在 `F:\blog-site\html_control`：

```powershell
npm test
npm run typecheck
npm run build
npm run dist:portable
```

在 `F:\blog-site`：

```powershell
npm run test:local-cover
npm run verify:site
npm run verify:advanced
npm run clean
npm run build
npm run verify:site -- --generated
git diff --check
git status --short
```

完成时必须报告各命令的实际退出状态、测试数量、portable EXE 的绝对路径，以及任何未完成或仅人工验证的项目。
