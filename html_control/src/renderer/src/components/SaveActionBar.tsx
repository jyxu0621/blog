interface SaveActionBarProps {
  dirtyCount: number;
  busy: boolean;
  compatible: boolean;
  onSave: () => void;
}

export function SaveActionBar({ dirtyCount, busy, compatible, onSave }: SaveActionBarProps) {
  const hasChanges = dirtyCount > 0;
  return <div className="save-action-bar" role="region" aria-label="配置保存操作">
    <div className="save-action-status">
      <div className={`fw-semibold ${hasChanges ? "text-primary" : "text-success"}`}>
        <i className={`bi ${hasChanges ? "bi-pencil-square" : "bi-check-circle-fill"} me-2`} />
        {hasChanges ? `${dirtyCount} 个配置文件有未保存修改` : "当前配置已保存"}
      </div>
      <div className="small text-secondary mt-1">
        此按钮只保存主题配置；检查效果请到“构建与预览”，Git 提交与网站发布仍在 HexoHub 完成。
      </div>
    </div>
    <button
      type="button"
      className="btn btn-primary btn-lg save-primary-button"
      disabled={!hasChanges || busy || !compatible}
      onClick={onSave}
    >
      <i className="bi bi-save2 me-2" />保存并应用配置
    </button>
  </div>;
}
