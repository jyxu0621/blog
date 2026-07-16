export type ConfigFileId = "hexo" | "stellar" | "widgets";

export type FieldType = "string" | "number" | "boolean" | "select" | "array" | "object" | "yaml";

export interface FieldSchema {
  file: ConfigFileId;
  path: string[];
  label: string;
  description: string;
  type: FieldType;
  options?: Array<{ label: string; value: unknown }>;
  critical?: boolean;
  helpUrl?: string;
  group: string;
}

export interface EffectiveField {
  schema: FieldSchema;
  defaultValue: unknown;
  overrideValue: unknown;
  effectiveValue: unknown;
  source: "default" | "override";
  dirty: boolean;
  errors: string[];
}

export interface ConfigFileState {
  id: ConfigFileId;
  path: string;
  exists: boolean;
  hash: string;
  modifiedAt: string;
}

export interface ProjectSnapshot {
  root: string;
  hexoVersion: string;
  stellarVersion: string;
  compatible: boolean;
  files: ConfigFileState[];
}

export interface ConfigDocumentSnapshot {
  file: ConfigFileId;
  path: string;
  hash: string;
  source: string;
  values: Record<string, unknown>;
  defaults: Record<string, unknown>;
  effective: Record<string, unknown>;
}

export interface SaveRequest {
  file: ConfigFileId;
  baseHash: string;
  source: string;
}

export interface SaveResult {
  changed: boolean;
  hash: string;
  backupId?: string;
  diff: string;
}

export interface RestoreDefaultRequest {
  file: ConfigFileId;
  baseHash: string;
  path: string[];
}

export interface BackupEntry {
  id: string;
  name?: string;
  createdAt: string;
  automatic: boolean;
}

export interface ValidationIssue {
  level: "error" | "warning";
  file?: ConfigFileId;
  path?: string[];
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface TaskEvent {
  taskId: string;
  timestamp: string;
  phase: string;
  level: "info" | "stdout" | "stderr" | "success" | "error";
  message: string;
  exitCode?: number;
}

export interface PreviewState {
  status: "stopped" | "starting" | "running" | "failed";
  port?: number;
  url?: string;
  error?: string;
}

export interface StellarControlApi {
  project: { load(): Promise<ProjectSnapshot>; selectDirectory(): Promise<ProjectSnapshot | null> };
  config: {
    read(file: ConfigFileId): Promise<ConfigDocumentSnapshot>;
    save(requests: SaveRequest[]): Promise<SaveResult[]>;
    restoreDefault(request: RestoreDefaultRequest): Promise<SaveResult>;
  };
  backup: {
    list(): Promise<BackupEntry[]>;
    create(name?: string): Promise<BackupEntry>;
    restore(id: string): Promise<ProjectSnapshot>;
  };
  validation: { run(): Promise<string>; cancel(taskId: string): Promise<void> };
  preview: { start(): Promise<string>; stop(): Promise<void>; refresh(): Promise<PreviewState> };
  tasks: { getHistory(): Promise<TaskEvent[]>; subscribe(listener: (event: TaskEvent) => void): () => void };
}
