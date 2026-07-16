import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { TaskEvent } from "../../shared/types";

export interface CommandSpec {
  phase: string;
  command: string;
  args: string[];
}

type Listener = (event: TaskEvent) => void;

export function commandForSpawn(command: string, args: string[]): { command: string; args: string[] } {
  const needsCommandProcessor = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(command);
  return needsCommandProcessor
    ? { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", command, ...args] }
    : { command, args };
}

export class TaskService {
  private readonly listeners = new Set<Listener>();
  private readonly history: TaskEvent[] = [];
  private readonly running = new Map<string, ChildProcess>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getHistory(): TaskEvent[] {
    return [...this.history];
  }

  publish(event: TaskEvent): void {
    this.history.push(event);
    if (this.history.length > 2000) this.history.splice(0, this.history.length - 2000);
    for (const listener of this.listeners) listener(event);
  }

  async runPipeline(label: string, cwd: string, commands: CommandSpec[]): Promise<string> {
    const taskId = `${label}-${randomUUID()}`;
    for (const spec of commands) await this.runCommand(taskId, cwd, spec);
    return taskId;
  }

  async cancel(taskId: string): Promise<void> {
    const child = this.running.get(taskId);
    if (!child) return;
    if (process.platform === "win32" && child.pid) {
      await new Promise<void>((resolve) => {
        spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true })
          .once("close", () => resolve())
          .once("error", () => resolve());
      });
    } else child.kill();
  }

  private runCommand(taskId: string, cwd: string, spec: CommandSpec): Promise<void> {
    const emit = (level: TaskEvent["level"], message: string, exitCode?: number) => {
      this.publish({ taskId, timestamp: new Date().toISOString(), phase: spec.phase, level, message, exitCode });
    };
    emit("info", `开始：${spec.command} ${spec.args.join(" ")}`);
    return new Promise((resolve, reject) => {
      const executable = commandForSpawn(spec.command, spec.args);
      const child = spawn(executable.command, executable.args, { cwd, windowsHide: true, shell: false });
      this.running.set(taskId, child);
      child.stdout?.on("data", (chunk) => emit("stdout", String(chunk)));
      child.stderr?.on("data", (chunk) => emit("stderr", String(chunk)));
      child.once("error", (error) => {
        this.running.delete(taskId);
        emit("error", error.message);
        reject(error);
      });
      child.once("close", (code) => {
        this.running.delete(taskId);
        if (code === 0) {
          emit("success", "完成", 0);
          resolve();
        } else {
          const error = new Error(`${spec.phase} 失败，退出码 ${code ?? -1}`);
          emit("error", error.message, code ?? -1);
          reject(error);
        }
      });
    });
  }
}
