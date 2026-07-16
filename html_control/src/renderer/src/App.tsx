import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { createTwoFilesPatch } from "diff";
import { HashRouter, NavLink, Route, Routes, useParams } from "react-router-dom";
import { parseDocument } from "yaml";
import type { ConfigFileId, EffectiveField } from "../../shared/types";
import { FieldEditor } from "./components/FieldEditor";
import { WidgetManager } from "./components/WidgetManager";
import { SiteTreeEditor } from "./components/SiteTreeEditor";
import { createFields, removeDraftValue, updateDraftValue } from "./store/document-model";
import { dirtyFiles, useAppStore } from "./store/app-store";

interface Section {
  id: string;
  title: string;
  icon: string;
  files: ConfigFileId[];
  roots?: Partial<Record<ConfigFileId, string[]>>;
}

const sections: Section[] = [
  { id: "brand", title: "站点与品牌", icon: "bi-stars", files: ["hexo", "stellar"], roots: {
    hexo: ["title", "subtitle", "description", "keywords", "author", "language", "timezone"],
    stellar: ["preconnect", "inject", "logo", "open_graph", "structured_data"],
  } },
  { id: "navigation", title: "导航与站点结构", icon: "bi-diagram-3", files: ["stellar"], roots: { stellar: ["menubar", "site_tree"] } },
  { id: "widgets", title: "侧边栏组件", icon: "bi-layout-sidebar", files: ["widgets"] },
  { id: "content", title: "内容默认外观", icon: "bi-file-earmark-text", files: ["stellar"], roots: { stellar: ["article", "notebook"] } },
  { id: "seo", title: "SEO、搜索与评论", icon: "bi-search", files: ["stellar"], roots: { stellar: ["canonical", "search", "comments", "footer"] } },
  { id: "integrations", title: "插件与数据服务", icon: "bi-boxes", files: ["stellar"], roots: { stellar: ["tag_plugins", "dependencies", "data_services", "plugins"] } },
  { id: "appearance", title: "外观与资源", icon: "bi-palette", files: ["stellar"], roots: { stellar: ["stellar", "style", "default", "api_host", "system"] } },
  { id: "hexo", title: "Hexo 高级设置", icon: "bi-gear", files: ["hexo"] },
];

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="mb-4"><h2 className="mb-1">{title}</h2><div className="text-secondary">{subtitle}</div></div>;
}

function Dashboard() {
  const state = useAppStore();
  const { project, backups, logs, preview, selectProject, createBackup, restoreBackup, busy } = state;
  if (!project) return null;
  const lastValidation = [...logs].reverse().find((event) => event.taskId.startsWith("validate-"));
  const changedCount = dirtyFiles(state).length;
  return <>
    <PageHeader title="控制台总览" subtitle="HexoHub 负责内容与发布，本控制台负责 Stellar 主题配置。" />
    {!project.compatible && <div className="alert alert-danger">检测到 Stellar {project.stellarVersion}，仅支持 1.33.1，结构化保存已停用。</div>}
    <div className="row g-3 mb-4">
      <div className="col-md-4"><div className="small-box text-bg-primary"><div className="inner"><h3>Hexo {project.hexoVersion}</h3><p>站点生成器</p></div><i className="small-box-icon bi bi-hexagon" /></div></div>
      <div className="col-md-4"><div className={`small-box ${project.compatible ? "text-bg-success" : "text-bg-danger"}`}><div className="inner"><h3>Stellar {project.stellarVersion}</h3><p>{project.compatible ? "版本兼容" : "版本不兼容"}</p></div><i className="small-box-icon bi bi-stars" /></div></div>
      <div className="col-md-4"><div className="small-box text-bg-info"><div className="inner"><h3>{project.files.filter((file) => file.exists).length}/3</h3><p>配置文件就绪</p></div><i className="small-box-icon bi bi-filetype-yml" /></div></div>
    </div>
    <div className="row g-3">
      <div className="col-lg-7"><div className="card"><div className="card-header"><h3 className="card-title">项目状态</h3></div><div className="card-body">
        <dl className="row mb-0"><dt className="col-sm-3">博客目录</dt><dd className="col-sm-9 font-monospace">{project.root}</dd></dl>
        <button className="btn btn-outline-primary btn-sm mt-3" onClick={() => void selectProject()}>选择其他项目</button>
        <hr />
        {project.files.map((file) => <div key={file.id} className="d-flex justify-content-between border-bottom py-2"><span>{file.path}</span><span className={`badge ${file.exists ? "text-bg-success" : "text-bg-danger"}`}>{file.exists ? "已读取" : "缺失"}</span></div>)}
      </div></div></div>
      <div className="col-lg-5"><div className="card"><div className="card-header d-flex justify-content-between"><h3 className="card-title">配置备份</h3><button disabled={busy} className="btn btn-sm btn-primary ms-auto" onClick={() => void createBackup(window.prompt("备份名称（留空为自动备份）") || undefined)}>创建备份</button></div><div className="card-body p-0"><div className="list-group list-group-flush">
        {backups.length === 0 && <div className="p-3 text-secondary">暂无备份</div>}
        {backups.slice(0, 8).map((entry) => <div className="list-group-item d-flex justify-content-between align-items-center" key={entry.id}><div><div>{entry.name || "自动备份"}</div><small className="text-secondary">{new Date(entry.createdAt).toLocaleString()}</small></div><button className="btn btn-sm btn-outline-warning" onClick={() => { if (window.confirm("恢复前会先备份当前配置，确认继续？")) void restoreBackup(entry.id); }}>恢复</button></div>)}
      </div></div></div></div>
    </div>
    <div className="row g-3 mt-1">
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><div className="text-secondary small">未保存修改</div><div className="h4 mb-0">{changedCount} 个文件</div></div></div></div>
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><div className="text-secondary small">最近验证</div><div className={`h6 mb-0 ${lastValidation?.level === "error" ? "text-danger" : ""}`}>{lastValidation ? `${lastValidation.phase}：${lastValidation.message.trim()}` : "尚未运行"}</div></div></div></div>
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><div className="text-secondary small">Hexo 预览</div><div className="h6 mb-0">{preview.status === "running" ? `运行中 · ${preview.port}` : preview.status === "failed" ? `失败：${preview.error}` : "未运行"}</div></div></div></div>
    </div>
  </>;
}

function ConfigPage() {
  const { sectionId = "brand" } = useParams();
  const section = sections.find((candidate) => candidate.id === sectionId) ?? sections[0];
  const { documents, drafts, search, setDraft, project } = useAppStore();
  const fieldResult = useMemo(() => {
    try {
      const fields = section.files.flatMap((file) => {
        const document = documents[file];
        const source = drafts[file];
        if (!document || source === undefined) return [];
        return createFields(document, source).filter((field) => {
          const roots = section.roots?.[file];
          const inSection = !roots || roots.includes(field.schema.path[0]);
          const haystack = [field.schema.label, field.schema.group, field.schema.description, field.schema.path.join(".")].join(" ").toLowerCase();
          return inSection && (!search || haystack.includes(search.toLowerCase()));
        });
      });
      return { fields, error: "" };
    } catch (error) {
      return { fields: [] as EffectiveField[], error: error instanceof Error ? error.message : String(error) };
    }
  }, [documents, drafts, search, section]);
  const fields = fieldResult.fields;
  const parseError = fieldResult.error;
  const update = (field: EffectiveField, value: unknown) => {
    const source = drafts[field.schema.file];
    if (source !== undefined) setDraft(field.schema.file, updateDraftValue(source, field.schema.path, value));
  };
  const restore = (field: EffectiveField) => {
    const source = drafts[field.schema.file];
    if (source !== undefined) setDraft(field.schema.file, removeDraftValue(source, field.schema.path));
  };
  return <>
    <PageHeader title={section.title} subtitle={`当前显示 ${fields.length} 个可编辑字段；支持按中文名称或 YAML 路径搜索。`} />
    {!project?.compatible && <div className="alert alert-danger">Stellar 版本不兼容，结构化编辑已停用。</div>}
    {parseError && <div className="alert alert-danger">{parseError}</div>}
    {section.id === "widgets" && drafts.widgets !== undefined && drafts.stellar !== undefined && <WidgetManager widgetsSource={drafts.widgets} stellarSource={drafts.stellar} onWidgetsChange={(source) => setDraft("widgets", source)} onStellarChange={(source) => setDraft("stellar", source)} />}
    {section.id === "navigation" && <SiteTreeEditor fields={fields} widgetNames={Object.keys(documents.widgets?.effective ?? {})} onChange={update} />}
    {fields.length === 0 && !parseError ? <div className="alert alert-info">没有匹配的配置字段。</div> : <div className="config-grid">{fields.map((field) => <FieldEditor key={`${field.schema.file}:${field.schema.path.join(".")}`} field={field} onChange={(value) => update(field, value)} onRestoreDefault={() => restore(field)} />)}</div>}
  </>;
}

function YamlPage() {
  const { documents, drafts, setDraft } = useAppStore();
  const [active, setActive] = useState<ConfigFileId>("stellar");
  const [error, setError] = useState("");
  const source = drafts[active] ?? "";
  const change = (value: string) => {
    setDraft(active, value);
    const document = parseDocument(value);
    setError(document.errors[0]?.message ?? "");
  };
  return <>
    <PageHeader title="高级 YAML" subtitle="表单与源码共享同一份草稿；语法错误时不会保存。" />
    <ul className="nav nav-tabs mb-3">{(["hexo", "stellar", "widgets"] as ConfigFileId[]).map((file) => <li className="nav-item" key={file}><button className={`nav-link ${active === file ? "active" : ""}`} onClick={() => setActive(file)}>{documents[file]?.path.split(/[\\/]/).at(-1)}</button></li>)}</ul>
    {error && <div className="alert alert-danger">{error}</div>}
    <div className="yaml-editor"><CodeMirror value={source} height="calc(100vh - 280px)" extensions={[yaml()]} onChange={change} basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }} /></div>
  </>;
}

function PreviewPage() {
  const { logs, preview, busy, error, runValidation, cancelValidation, startPreview, stopPreview } = useAppStore();
  const [width, setWidth] = useState("100%");
  return <>
    <PageHeader title="构建与预览" subtitle="按固定流水线验证并构建真实 Hexo 网站，不执行提交或部署。" />
    <div className="d-flex flex-wrap gap-2 mb-3">
      <button disabled={busy} className="btn btn-outline-primary" onClick={() => void runValidation()}><i className="bi bi-check2-circle me-1" />验证并构建</button>
      <button disabled={!busy} className="btn btn-outline-warning" onClick={() => void cancelValidation()}><i className="bi bi-x-octagon me-1" />取消任务</button>
      <button disabled={busy || preview.status === "running"} className="btn btn-primary" onClick={() => void startPreview()}><i className="bi bi-play-fill me-1" />构建并启动预览</button>
      <button disabled={preview.status === "stopped"} className="btn btn-outline-danger" onClick={() => void stopPreview()}><i className="bi bi-stop-fill me-1" />停止预览</button>
      <div className="btn-group ms-auto">{[["100%", "桌面"], ["768px", "平板"], ["390px", "手机"]].map(([value, label]) => <button key={value} className={`btn btn-outline-secondary ${width === value ? "active" : ""}`} onClick={() => setWidth(value)}>{label}</button>)}</div>
    </div>
    {error && <div className="alert alert-danger">{error}</div>}
    {preview.url ? <div className="preview-shell" style={{ width }}><iframe title="Hexo 博客预览" src={preview.url} /></div> : <div className="card mb-3"><div className="card-body text-center text-secondary py-5">启动预览后将在这里显示真实博客页面。</div></div>}
    <h3 className="h5 mt-4">运行日志</h3><div className="log-view">{logs.length ? logs.map((event) => `[${new Date(event.timestamp).toLocaleTimeString()}] ${event.phase} ${event.message}`).join("\n") : "等待任务运行…"}</div>
  </>;
}

function SaveDialog() {
  const state = useAppStore();
  const files = dirtyFiles(state);
  const [open, setOpen] = useState(false);
  const diff = files.map((file) => createTwoFilesPatch(state.documents[file]?.path ?? file, state.documents[file]?.path ?? file, state.documents[file]?.source ?? "", state.drafts[file] ?? "", "当前文件", "待保存")).join("\n");
  if (files.length === 0) return null;
  return <div className="sticky-actions"><div className="container-fluid d-flex align-items-center justify-content-between"><span className="text-primary fw-semibold"><i className="bi bi-pencil-square me-2" />{files.length} 个配置文件有未保存修改</span><button className="btn btn-primary" onClick={() => setOpen(true)}>查看差异并保存</button></div>{open && <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,.55)" }}><div className="modal-dialog modal-xl modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">确认配置差异</h5><button className="btn-close" onClick={() => setOpen(false)} /></div><div className="modal-body"><pre className="diff-view">{diff}</pre></div><div className="modal-footer"><button className="btn btn-outline-secondary" onClick={() => setOpen(false)}>取消</button><button disabled={state.busy || !state.project?.compatible} className="btn btn-primary" onClick={() => void state.saveFiles(files).then(() => setOpen(false))}>创建备份并保存</button></div></div></div></div>}</div>;
}

function Shell() {
  const state = useAppStore();
  useEffect(() => { void state.load(); const detach = state.attachLogs(); return detach; }, []);
  if (state.loading && !state.project) return <div className="vh-100 d-flex align-items-center justify-content-center"><div className="spinner-border text-primary" /></div>;
  return <div className="app-wrapper">
    <nav className="app-header navbar navbar-expand bg-body"><div className="container-fluid"><button className="nav-link" data-lte-toggle="sidebar"><i className="bi bi-list" /></button><div className="ms-3 fw-semibold">Stellar 本地主题控制台</div><div className="ms-auto d-flex align-items-center gap-3"><input className="form-control form-control-sm" style={{ width: 280 }} placeholder="搜索中文名称或 YAML 路径" value={state.search} onChange={(event) => state.setSearch(event.target.value)} />{dirtyFiles(state).length > 0 && <span className="badge text-bg-primary">未保存</span>}</div></div></nav>
    <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark"><div className="sidebar-brand"><NavLink className="brand-link" to="/"><span className="brand-text fw-light"><i className="bi bi-stars me-2" />Stellar Control</span></NavLink></div><div className="sidebar-wrapper"><nav className="mt-2"><ul className="nav sidebar-menu flex-column" data-lte-toggle="treeview" role="menu">
      <li className="nav-item"><NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><i className="nav-icon bi bi-speedometer2" /><p>总览</p></NavLink></li>
      {sections.map((section) => <li className="nav-item" key={section.id}><NavLink to={`/section/${section.id}`} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><i className={`nav-icon bi ${section.icon}`} /><p>{section.title}</p></NavLink></li>)}
      <li className="nav-item"><NavLink to="/yaml" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><i className="nav-icon bi bi-code-square" /><p>高级 YAML</p></NavLink></li>
      <li className="nav-item"><NavLink to="/preview" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><i className="nav-icon bi bi-display" /><p>构建与预览</p></NavLink></li>
    </ul></nav></div></aside>
    <main className="app-main"><div className="app-content"><div className="container-fluid py-4">{state.error && <div className="alert alert-danger alert-dismissible">{state.error}<button className="btn-close" onClick={state.clearError} /></div>}<Routes><Route path="/" element={<Dashboard />} /><Route path="/section/:sectionId" element={<ConfigPage />} /><Route path="/yaml" element={<YamlPage />} /><Route path="/preview" element={<PreviewPage />} /></Routes></div></div><SaveDialog /></main>
  </div>;
}

export function App() { return <HashRouter><Shell /></HashRouter>; }
