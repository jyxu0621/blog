# Stellar 本地主题控制台

这是 `F:\blog-site` 的本地 Electron 管理工具，用 AdminLTE v4 将 Hexo 与 Stellar 1.33.1 的 YAML 配置变成中文可视化表单。它不管理文章、Git 或部署，也不提供任意终端。

## 使用便携版

1. 将 `Stellar-Theme-Control-Portable-0.1.0.exe` 放在 `F:\blog-site\html_control\release` 中运行。
2. 应用默认管理 EXE 所在位置上两级的 Hexo 项目，即 `F:\blog-site`。
3. 也可以在“总览”中选择其他安装了 Stellar 1.33.1 的 Hexo 项目。
4. 底部操作栏始终显示保存状态。修改表单后，点击醒目的“保存并应用配置”，查看逐行差异并确认写入。
5. 每次实际写入前都会在 `.runtime\backups` 建立三个配置文件的联合快照。
6. “构建与预览”会按固定流程验证、清理、构建并启动真实 Hexo 页面。

配置页面默认使用“常用设置”模式，只显示常改项目、中文名称和简短用途。需要修改不常用参数时，再切换到“全部高级设置”；YAML 键名默认收在“查看技术信息”中。

## 修改与发布流程

1. 在左侧栏目修改主题配置；此时修改只保存在应用内存中。
2. 点击底部“保存并应用配置”，确认差异后写入 YAML。
3. 进入“构建与预览”，验证并查看真实博客效果。
4. 确认效果后，回到 HexoHub 完成 Git 提交、推送和网站发布。本控制台不会执行这些发布操作。

## 本地开发

要求 Windows x64、Node.js 20 或更高版本。

```powershell
cd F:\blog-site\html_control
npm install
npm run typecheck
npm test
npm run dev
```

生成单文件便携 EXE：

```powershell
npm run dist:portable
```

## 数据与安全边界

- 用户覆盖只写入 `_config.yml`、`_config.stellar.yml` 和 `source\_data\widgets.yml`。
- 不修改 `node_modules\hexo-theme-stellar`，主题默认值仅用于读取和合并。
- 未编辑字段、未知字段和 YAML 注释会保留；无修改保存不会重写文件。
- 文件被 HexoHub 或其他编辑器外部修改后，会因哈希冲突而拒绝覆盖。
- 自动备份保留最近 30 组；手工命名备份长期保留。
- 关闭应用时只终止由本应用启动的 Hexo 预览进程。
