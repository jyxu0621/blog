import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc";
import type { ConfigFileId, RestoreDefaultRequest, SaveRequest, StellarControlApi, TaskEvent } from "../shared/types";

const api: StellarControlApi = {
  project: {
    load: () => ipcRenderer.invoke(IPC.projectLoad),
    selectDirectory: () => ipcRenderer.invoke(IPC.projectSelect),
  },
  config: {
    read: (file: ConfigFileId) => ipcRenderer.invoke(IPC.configRead, file),
    save: (requests: SaveRequest[]) => ipcRenderer.invoke(IPC.configSave, requests),
    restoreDefault: (request: RestoreDefaultRequest) => ipcRenderer.invoke(IPC.configRestoreDefault, request),
  },
  backup: {
    list: () => ipcRenderer.invoke(IPC.backupList),
    create: (name?: string) => ipcRenderer.invoke(IPC.backupCreate, name),
    restore: (id: string) => ipcRenderer.invoke(IPC.backupRestore, id),
  },
  validation: {
    run: () => ipcRenderer.invoke(IPC.validationRun),
    cancel: (taskId: string) => ipcRenderer.invoke(IPC.validationCancel, taskId),
  },
  preview: {
    start: () => ipcRenderer.invoke(IPC.previewStart),
    stop: () => ipcRenderer.invoke(IPC.previewStop),
    refresh: () => ipcRenderer.invoke(IPC.previewRefresh),
  },
  tasks: {
    getHistory: () => ipcRenderer.invoke(IPC.tasksHistory),
    subscribe: (listener: (event: TaskEvent) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: TaskEvent) => listener(payload);
      ipcRenderer.on(IPC.tasksEvent, handler);
      return () => ipcRenderer.removeListener(IPC.tasksEvent, handler);
    },
  },
};

contextBridge.exposeInMainWorld("stellarControl", api);
