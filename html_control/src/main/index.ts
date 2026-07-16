import { access, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { parseDocument } from "yaml";
import { IPC } from "../shared/ipc";
import type { ConfigFileId, RestoreDefaultRequest, SaveRequest } from "../shared/types";
import { BackupService } from "./services/backup-service";
import { ConfigService, deepMerge } from "./services/config-service";
import { collectLocalResourcePaths, validateProjectConfig } from "../shared/validation/project-validation";
import {
  loadProjectSnapshot,
  resolveDefaultBlogRoot,
  resolvePackagedBlogRoot,
  resolvePortableBlogRoot,
  resolvePreloadPath,
  validateBlogRoot,
} from "./services/project-service";
import { PreviewService } from "./services/preview-service";
import { TaskService } from "./services/task-service";
import { ValidationService } from "./services/validation-service";

const tasks = new TaskService();
let currentRoot = "";
let preview: PreviewService;

function resolveInitialRoot(): string {
  if (process.env.STELLAR_BLOG_ROOT) return process.env.STELLAR_BLOG_ROOT;
  const portableDirectory = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDirectory) return resolvePortableBlogRoot(portableDirectory);
  if (app.isPackaged) return resolvePackagedBlogRoot(app.getPath("exe"));
  return resolveDefaultBlogRoot(app.getAppPath());
}

function backupService(): BackupService {
  return new BackupService(currentRoot, join(currentRoot, "html_control", ".runtime"));
}

function configService(): ConfigService {
  const backups = backupService();
  return new ConfigService(currentRoot, () => backups.create().then((entry) => entry.id));
}

async function validateSaveRequests(requests: SaveRequest[]): Promise<void> {
  const project = await loadProjectSnapshot(currentRoot);
  if (!project.compatible) throw new Error(`Stellar ${project.stellarVersion} 与本控制台不兼容，仅支持 1.33.1`);
  const service = configService();
  const snapshots = await Promise.all((["hexo", "stellar", "widgets"] as ConfigFileId[]).map((file) => service.read(file)));
  const byFile = new Map(requests.map((request) => [request.file, request.source]));
  const rawValues = {} as Record<ConfigFileId, Record<string, unknown>>;
  const effective = Object.fromEntries(snapshots.map((snapshot) => {
    const source = byFile.get(snapshot.file) ?? snapshot.source;
    const document = parseDocument(source);
    if (document.errors.length) throw document.errors[0];
    const values = (document.toJS() ?? {}) as Record<string, unknown>;
    rawValues[snapshot.file] = values;
    return [snapshot.file, deepMerge(snapshot.defaults, values)];
  })) as Record<ConfigFileId, Record<string, unknown>>;
  const packageJson = JSON.parse(await readFile(join(currentRoot, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  const validation = validateProjectConfig(
    effective.hexo,
    effective.stellar,
    effective.widgets,
    Boolean(packageJson.dependencies?.["hexo-filter-mathjax"]),
  );
  if (!validation.valid) throw new Error(validation.issues.map((issue) => `${issue.path?.join(".") ?? issue.file}: ${issue.message}`).join("\n"));
  const sourceRoot = resolve(currentRoot, "source");
  const siteRoot = String(effective.hexo.root ?? "/");
  for (const request of requests) {
    for (const resource of collectLocalResourcePaths(rawValues[request.file], siteRoot)) {
      const candidate = resolve(sourceRoot, resource.relativePath);
      if (relative(sourceRoot, candidate).startsWith("..")) throw new Error(`${resource.yamlPath.join(".")} 的本地资源路径越界`);
      await access(candidate).catch(() => { throw new Error(`${resource.yamlPath.join(".")} 引用的本地资源不存在：${resource.relativePath}`); });
    }
  }
}

function registerIpc(): void {
  ipcMain.handle(IPC.projectLoad, () => loadProjectSnapshot(currentRoot));
  ipcMain.handle(IPC.projectSelect, async () => {
    const selected = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "选择 Hexo Stellar 项目" });
    if (selected.canceled || !selected.filePaths[0]) return null;
    await validateBlogRoot(selected.filePaths[0]);
    await preview.stop();
    currentRoot = selected.filePaths[0];
    preview = new PreviewService(currentRoot, tasks);
    return loadProjectSnapshot(currentRoot);
  });
  ipcMain.handle(IPC.configRead, (_event, file: ConfigFileId) => configService().read(file));
  ipcMain.handle(IPC.configSave, async (_event, requests: SaveRequest[]) => {
    await validateSaveRequests(requests);
    return configService().saveMany(requests);
  });
  ipcMain.handle(IPC.configRestoreDefault, (_event, request: RestoreDefaultRequest) =>
    configService().restoreDefault(request),
  );
  ipcMain.handle(IPC.backupList, () => backupService().list());
  ipcMain.handle(IPC.backupCreate, (_event, name?: string) => backupService().create(name));
  ipcMain.handle(IPC.backupRestore, async (_event, id: string) => {
    await backupService().restore(id);
    return loadProjectSnapshot(currentRoot);
  });
  ipcMain.handle(IPC.validationRun, () => new ValidationService(currentRoot, tasks).runBuildPipeline());
  ipcMain.handle(IPC.validationCancel, (_event, taskId: string) => tasks.cancel(taskId));
  ipcMain.handle(IPC.previewStart, async () => {
    await new ValidationService(currentRoot, tasks).runBuildPipeline();
    return preview.start();
  });
  ipcMain.handle(IPC.previewStop, () => preview.stop());
  ipcMain.handle(IPC.previewRefresh, () => preview.current());
  ipcMain.handle(IPC.tasksHistory, () => tasks.getHistory());
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    title: "Stellar 本地主题控制台",
    show: false,
    webPreferences: {
      preload: resolvePreloadPath(__dirname),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env.ELECTRON_RENDERER_URL) window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else window.loadFile(join(__dirname, "../renderer/index.html"));
  return window;
}

app.whenReady().then(async () => {
  currentRoot = resolveInitialRoot();
  preview = new PreviewService(currentRoot, tasks);
  registerIpc();
  tasks.subscribe((event) => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(IPC.tasksEvent, event);
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let quittingAfterPreviewStop = false;
app.on("before-quit", (event) => {
  if (quittingAfterPreviewStop || !preview || preview.current().status === "stopped") return;
  event.preventDefault();
  void preview.stop().finally(() => {
    quittingAfterPreviewStop = true;
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
