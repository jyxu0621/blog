import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import type { PreviewState } from "../../shared/types";
import { commandForSpawn, TaskService } from "./task-service";

export async function findAvailablePort(start = 4000, end = 4010): Promise<number> {
  for (let port = start; port <= end; port += 1) {
    const available = await new Promise<boolean>((resolve) => {
      const server = createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error(`端口 ${start}-${end} 均被占用`);
}

async function waitForPreview(url: string, alive: () => boolean, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!alive()) throw new Error("预览进程在站点就绪前退出");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return;
    } catch {
      // Hexo still starting; retry until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Hexo 预览启动超时（30 秒）");
}

export class PreviewService {
  private child: ChildProcess | null = null;
  private state: PreviewState = { status: "stopped" };

  constructor(
    private readonly root: string,
    private readonly tasks: TaskService,
  ) {}

  current(): PreviewState {
    return { ...this.state };
  }

  async start(): Promise<PreviewState> {
    if (this.child && this.state.status === "running") return this.current();
    const port = await findAvailablePort();
    const taskId = `preview-${Date.now()}`;
    this.state = { status: "starting", port };
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const executable = commandForSpawn(command, ["run", "dev", "--", "--port", String(port)]);
    const child = spawn(executable.command, executable.args, {
      cwd: this.root,
      windowsHide: true,
      shell: false,
    });
    this.child = child;
    const publish = (level: "stdout" | "stderr" | "error", message: string) => {
      this.tasks.publish({ taskId, timestamp: new Date().toISOString(), phase: "Hexo 预览", level, message });
    };
    child.stdout?.on("data", (chunk) => publish("stdout", String(chunk)));
    child.stderr?.on("data", (chunk) => publish("stderr", String(chunk)));
    child.once("error", (error) => {
      publish("error", error.message);
      this.state = { status: "failed", error: error.message };
      this.child = null;
    });
    child.once("close", (code) => {
      if (this.child === child) {
        this.state = code === 0 ? { status: "stopped" } : { status: "failed", error: `预览进程退出码 ${code}` };
        this.child = null;
      }
    });
    const url = `http://127.0.0.1:${port}/blog/`;
    try {
      await waitForPreview(url, () => this.child === child);
    } catch (error) {
      await this.stop();
      throw error;
    }
    this.state = { status: "running", port, url };
    return this.current();
  }

  async stop(): Promise<void> {
    const child = this.child;
    if (!child) {
      this.state = { status: "stopped" };
      return;
    }
    this.child = null;
    if (process.platform === "win32" && child.pid) {
      await new Promise<void>((resolve) => {
        spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true })
          .once("close", () => resolve())
          .once("error", () => resolve());
      });
    } else child.kill("SIGTERM");
    this.state = { status: "stopped" };
  }
}
