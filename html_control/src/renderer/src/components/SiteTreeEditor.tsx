import { useState } from "react";
import type { EffectiveField } from "../../../shared/types";
import { reorderSidebar } from "../store/widget-model";

interface Props {
  fields: EffectiveField[];
  widgetNames: string[];
  onChange(field: EffectiveField, value: string): void;
}

export function SiteTreeEditor({ fields, widgetNames, onChange }: Props) {
  const [dragging, setDragging] = useState<{ path: string; index: number } | null>(null);
  const sidebars = fields.filter((field) => {
    const last = field.schema.path.at(-1);
    return field.schema.path[0] === "site_tree" && (last === "leftbar" || last === "rightbar");
  });
  if (!sidebars.length) return null;

  return <div className="card mb-4"><div className="card-header"><h3 className="card-title">页面侧栏拖拽分配</h3></div><div className="card-body">
    <p className="text-secondary small">拖动组件调整顺序；从下拉框加入组件。修改会同步到下方结构化字段和高级 YAML。</p>
    <div className="row g-3">{sidebars.map((field) => {
      const path = field.schema.path.join(".");
      const value = String(field.effectiveValue ?? "");
      const items = value.split(",").map((item) => item.trim()).filter(Boolean);
      return <div className="col-lg-6" key={path}><div className="border rounded p-3 h-100"><div className="fw-semibold font-monospace mb-2">{path}</div>
        <div className="d-flex flex-wrap gap-2 mb-2">{items.length ? items.map((item, index) => <span key={`${item}-${index}`} draggable className="badge text-bg-primary sidebar-chip" onDragStart={() => setDragging({ path, index })} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragging?.path === path) onChange(field, reorderSidebar(value, dragging.index, index)); setDragging(null); }}>{item}<button className="btn-close btn-close-white ms-2" aria-label={`移除 ${item}`} onClick={() => onChange(field, items.filter((_entry, itemIndex) => itemIndex !== index).join(", "))} /></span>) : <span className="text-secondary small">未分配组件</span>}</div>
        <select className="form-select form-select-sm" value="" onChange={(event) => { if (event.target.value) onChange(field, [...items, event.target.value].join(", ")); }}><option value="">添加组件…</option>{widgetNames.filter((name) => !items.includes(name)).map((name) => <option key={name}>{name}</option>)}</select>
      </div></div>;
    })}</div>
  </div></div>;
}
