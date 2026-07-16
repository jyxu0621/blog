import { create } from "zustand";
import type {
  BackupEntry,
  ConfigDocumentSnapshot,
  ConfigFileId,
  PreviewState,
  ProjectSnapshot,
  TaskEvent,
} from "../../../shared/types";

type Documents = Partial<Record<ConfigFileId, ConfigDocumentSnapshot>>;
type Drafts = Partial<Record<ConfigFileId, string>>;

interface AppState {
  project: ProjectSnapshot | null;
  documents: Documents;
  drafts: Drafts;
  backups: BackupEntry[];
  logs: TaskEvent[];
  preview: PreviewState;
  search: string;
  loading: boolean;
  busy: boolean;
  error: string;
  load(): Promise<void>;
  selectProject(): Promise<void>;
  setDraft(file: ConfigFileId, source: string): void;
  setSearch(search: string): void;
  saveFiles(files: ConfigFileId[]): Promise<void>;
  createBackup(name?: string): Promise<void>;
  restoreBackup(id: string): Promise<void>;
  runValidation(): Promise<void>;
  cancelValidation(): Promise<void>;
  startPreview(): Promise<void>;
  stopPreview(): Promise<void>;
  attachLogs(): () => void;
  clearError(): void;
}

async function readDocuments(): Promise<Documents> {
  const entries = await Promise.all(
    (["hexo", "stellar", "widgets"] as ConfigFileId[]).map(async (file) => [file, await window.stellarControl.config.read(file)] as const),
  );
  return Object.fromEntries(entries) as Documents;
}

export const useAppStore = create<AppState>((set, get) => ({
  project: null,
  documents: {},
  drafts: {},
  backups: [],
  logs: [],
  preview: { status: "stopped" },
  search: "",
  loading: false,
  busy: false,
  error: "",

  async load() {
    set({ loading: true, error: "" });
    try {
      const [project, documents, backups, logs, preview] = await Promise.all([
        window.stellarControl.project.load(),
        readDocuments(),
        window.stellarControl.backup.list(),
        window.stellarControl.tasks.getHistory(),
        window.stellarControl.preview.refresh(),
      ]);
      const drafts = Object.fromEntries(
        Object.entries(documents).map(([file, document]) => [file, document?.source ?? ""]),
      ) as Drafts;
      set({ project, documents, drafts, backups, logs, preview, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },

  async selectProject() {
    const project = await window.stellarControl.project.selectDirectory();
    if (project) await get().load();
  },

  setDraft(file, source) {
    set((state) => ({ drafts: { ...state.drafts, [file]: source } }));
  },

  setSearch(search) { set({ search }); },

  async saveFiles(files) {
    set({ busy: true, error: "" });
    try {
      const requests = files.flatMap((file) => {
        const document = get().documents[file];
        const source = get().drafts[file];
        return !document || source === undefined || source === document.source
          ? []
          : [{ file, baseHash: document.hash, source }];
      });
      if (requests.length) await window.stellarControl.config.save(requests);
      await get().load();
      set({ busy: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), busy: false });
      throw error;
    }
  },

  async createBackup(name) {
    await window.stellarControl.backup.create(name);
    set({ backups: await window.stellarControl.backup.list() });
  },

  async restoreBackup(id) {
    set({ busy: true });
    try {
      await window.stellarControl.backup.restore(id);
      await get().load();
    } finally { set({ busy: false }); }
  },

  async runValidation() {
    set({ busy: true, error: "" });
    try { await window.stellarControl.validation.run(); }
    catch (error) { set({ error: error instanceof Error ? error.message : String(error) }); }
    finally { set({ busy: false }); }
  },

  async cancelValidation() {
    const taskId = [...get().logs].reverse().find((event) => event.taskId.startsWith("validate-"))?.taskId;
    if (taskId) await window.stellarControl.validation.cancel(taskId);
  },

  async startPreview() {
    set({ busy: true, error: "" });
    try {
      await window.stellarControl.preview.start();
      set({ preview: await window.stellarControl.preview.refresh() });
    } catch (error) { set({ error: error instanceof Error ? error.message : String(error) }); }
    finally { set({ busy: false }); }
  },

  async stopPreview() {
    await window.stellarControl.preview.stop();
    set({ preview: await window.stellarControl.preview.refresh() });
  },

  attachLogs() {
    return window.stellarControl.tasks.subscribe((event) => {
      set((state) => ({ logs: [...state.logs.slice(-1999), event] }));
    });
  },

  clearError() { set({ error: "" }); },
}));

export function dirtyFiles(state: Pick<AppState, "documents" | "drafts">): ConfigFileId[] {
  return (["hexo", "stellar", "widgets"] as ConfigFileId[]).filter(
    (file) => Boolean(state.documents[file]) && state.documents[file]?.source !== state.drafts[file],
  );
}
