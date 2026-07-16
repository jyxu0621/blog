import { useMemo, useState } from "react";
import { parseDocument } from "yaml";
import { removeDraftValue, updateDraftValue } from "../store/document-model";
import { findWidgetReferences, renameWidget } from "../store/widget-model";

const layouts = ["toc", "recent", "related", "linklist", "markdown", "tagcloud", "ghuser", "ghrepo", "timeline"];

interface WidgetManagerProps {
  widgetsSource: string;
  stellarSource: string;
  onWidgetsChange(source: string): void;
  onStellarChange(source: string): void;
}

function readWidgets(source: string): Record<string, Record<string, unknown>> {
  const document = parseDocument(source);
  if (document.errors.length) throw document.errors[0];
  const value = document.toJS();
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Record<string, unknown>>
    : {};
}

export function WidgetManager({ widgetsSource, stellarSource, onWidgetsChange, onStellarChange }: WidgetManagerProps) {
  const [newName, setNewName] = useState("");
  const [layout, setLayout] = useState("recent");
  const [message, setMessage] = useState("");
  const widgets = useMemo(() => readWidgets(widgetsSource), [widgetsSource]);
  const names = Object.keys(widgets);

  const add = () => {
    const name = newName.trim();
    if (!name) return setMessage("请输入组件名称");
    if (widgets[name]) return setMessage(`组件 ${name} 已存在`);
    onWidgetsChange(updateDraftValue(widgetsSource, [name], { layout }));
    setNewName("");
    setMessage(`已新增 ${name}，保存配置后生效`);
  };

  const duplicate = (name: string) => {
    const target = window.prompt("新组件名称", `${name}_copy`)?.trim();
    if (!target) return;
    if (widgets[target]) return setMessage(`组件 ${target} 已存在`);
    onWidgetsChange(updateDraftValue(widgetsSource, [target], structuredClone(widgets[name])));
    setMessage(`已复制为 ${target}`);
  };

  const rename = (name: string) => {
    const target = window.prompt("新的组件名称", name)?.trim();
    if (!target || target === name) return;
    try {
      const renamed = renameWidget(widgetsSource, stellarSource, name, target);
      onWidgetsChange(renamed.widgets);
      onStellarChange(renamed.stellar);
      setMessage(`已将 ${name} 重命名为 ${target}，并同步更新侧边栏引用`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const remove = (name: string) => {
    const references = findWidgetReferences(stellarSource, name);
    if (references.length) {
      setMessage(`不能删除 ${name}，仍被引用：${references.join("、")}`);
      return;
    }
    if (!window.confirm(`确认删除组件 ${name}？`)) return;
    onWidgetsChange(removeDraftValue(widgetsSource, [name]));
    setMessage(`已删除 ${name}`);
  };

  return <div className="card mb-4">
    <div className="card-header"><h3 className="card-title">组件管理</h3></div>
    <div className="card-body">
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-5"><label className="form-label">新组件名称</label><input className="form-control" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="例如 latest_posts" /></div>
        <div className="col-md-4"><label className="form-label">布局类型</label><select className="form-select" value={layout} onChange={(event) => setLayout(event.target.value)}>{layouts.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="col-md-3"><button className="btn btn-primary w-100" onClick={add}><i className="bi bi-plus-lg me-1" />新增组件</button></div>
      </div>
      {message && <div className="alert alert-info py-2">{message}</div>}
      <div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead><tr><th>名称</th><th>类型</th><th>引用位置</th><th className="text-end">操作</th></tr></thead><tbody>
        {names.map((name) => {
          const references = findWidgetReferences(stellarSource, name);
          return <tr key={name}><td className="font-monospace">{name}</td><td><span className="badge text-bg-secondary">{String(widgets[name]?.layout ?? "自定义")}</span></td><td className="small text-secondary">{references.join("、") || "未引用"}</td><td className="text-end"><div className="btn-group btn-group-sm"><button className="btn btn-outline-secondary" onClick={() => duplicate(name)}>复制</button><button className="btn btn-outline-primary" onClick={() => rename(name)}>重命名</button><button className="btn btn-outline-danger" onClick={() => remove(name)}>删除</button></div></td></tr>;
        })}
      </tbody></table></div>
    </div>
  </div>;
}
