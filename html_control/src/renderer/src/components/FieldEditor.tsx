import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { EffectiveField } from "../../../shared/types";

interface Props {
  field: EffectiveField;
  onChange(value: unknown): void;
  onRestoreDefault(): void;
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const sortable = useSortable({ id });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className="input-group mb-2"
    >
      <button className="btn btn-outline-secondary" type="button" aria-label="拖动排序" {...sortable.attributes} {...sortable.listeners}>
        ⋮⋮
      </button>
      {children}
    </div>
  );
}

function ArrayEditor({ value, onChange }: { value: unknown[]; onChange(value: unknown[]): void }) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = value.map((_item, index) => `item-${index}`);
  const finishDrag = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const from = ids.indexOf(String(event.active.id));
    const to = ids.indexOf(String(event.over.id));
    if (from >= 0 && to >= 0) onChange(arrayMove(value, from, to));
  };
  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={finishDrag}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {value.map((item, index) => {
            const objectValue = item !== null && typeof item === "object";
            return (
              <SortableRow key={ids[index]} id={ids[index]}>
                {objectValue ? (
                  <textarea
                    className="form-control font-monospace"
                    rows={3}
                    value={JSON.stringify(item, null, 2)}
                    onChange={(event) => {
                      try {
                        const next = [...value];
                        next[index] = JSON.parse(event.target.value);
                        onChange(next);
                      } catch {
                        // Keep the last valid object until the JSON becomes valid again.
                      }
                    }}
                  />
                ) : (
                  <input
                    className="form-control"
                    value={String(item ?? "")}
                    onChange={(event) => {
                      const next = [...value];
                      next[index] = event.target.value;
                      onChange(next);
                    }}
                  />
                )}
                <button className="btn btn-outline-danger" type="button" onClick={() => onChange(value.filter((_entry, itemIndex) => itemIndex !== index))}>
                  删除
                </button>
              </SortableRow>
            );
          })}
        </SortableContext>
      </DndContext>
      <button className="btn btn-sm btn-outline-primary" type="button" aria-label="添加项目" onClick={() => onChange([...value, ""])}>
        添加项目
      </button>
    </div>
  );
}

export function FieldEditor({ field, onChange, onRestoreDefault }: Props) {
  const { schema } = field;
  const sourceLabel = field.dirty ? "本次修改" : field.source === "override" ? "用户覆盖" : "主题默认";
  let control: React.ReactNode;
  if (schema.type === "boolean") {
    control = (
      <div className="form-check form-switch">
        <input className="form-check-input" type="checkbox" checked={Boolean(field.effectiveValue)} onChange={(event) => onChange(event.target.checked)} />
      </div>
    );
  } else if (schema.type === "number") {
    control = <input className="form-control" type="number" value={Number(field.effectiveValue ?? 0)} onChange={(event) => onChange(Number(event.target.value))} />;
  } else if (schema.type === "select") {
    control = (
      <select className="form-select" value={String(field.effectiveValue ?? "")} onChange={(event) => {
        const option = schema.options?.find((candidate) => String(candidate.value) === event.target.value);
        onChange(option?.value ?? event.target.value);
      }}>
        {schema.options?.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
      </select>
    );
  } else if (schema.type === "array") {
    control = <ArrayEditor value={Array.isArray(field.effectiveValue) ? field.effectiveValue : []} onChange={onChange} />;
  } else if (schema.type === "object" || schema.type === "yaml") {
    control = (
      <textarea className="form-control font-monospace" rows={5} value={JSON.stringify(field.effectiveValue ?? {}, null, 2)} onChange={(event) => {
        try { onChange(JSON.parse(event.target.value)); } catch { /* retain last valid JSON */ }
      }} />
    );
  } else {
    const value = String(field.effectiveValue ?? "");
    control = value.includes("\n") || value.length > 100
      ? <textarea className="form-control" rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
      : <input className="form-control" value={value} onChange={(event) => onChange(event.target.value)} />;
  }

  return (
    <div className={`card mb-3 ${schema.critical ? "border-warning" : ""}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div>
            <label className="form-label fw-semibold mb-0">{schema.label}</label>
          </div>
          <div className="d-flex gap-2">
            {schema.critical && <span className="badge text-bg-warning">关键配置</span>}
            <span className={`badge ${field.dirty ? "text-bg-primary" : field.source === "override" ? "text-bg-info" : "text-bg-secondary"}`}>{sourceLabel}</span>
          </div>
        </div>
        <p className="text-secondary small">{schema.description}</p>
        {control}
        <div className="d-flex justify-content-between align-items-end mt-2 gap-3">
          <div>
            {schema.helpUrl && <a className="small" href={schema.helpUrl} target="_blank" rel="noreferrer"><i className="bi bi-book me-1" />查看官方说明</a>}
            <details className="field-technical mt-1"><summary>查看技术信息</summary><code>{schema.path.join(".")}</code></details>
          </div>
          {field.source === "override" && <button type="button" className="btn btn-sm btn-link" onClick={onRestoreDefault}>恢复主题默认</button>}
        </div>
        {field.errors.map((error) => <div key={error} className="text-danger small mt-1">{error}</div>)}
      </div>
    </div>
  );
}
