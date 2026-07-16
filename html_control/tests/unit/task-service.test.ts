import { createServer } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findAvailablePort, PreviewService } from "../../src/main/services/preview-service";
import { TaskService } from "../../src/main/services/task-service";

describe("TaskService", () => {
  it("runs npm commands on Windows without spawn EINVAL", async () => {
    const service = new TaskService();
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    await expect(service.runPipeline("npm", process.cwd(), [
      { phase: "npm version", command: npm, args: ["--version"] },
    ])).resolves.toMatch(/^npm-/);
  });

  it("runs fixed commands in order and streams their output", async () => {
    const service = new TaskService();
    const events: string[] = [];
    service.subscribe((event) => events.push(`${event.phase}:${event.message.trim()}`));

    await service.runPipeline("test", process.cwd(), [
      { phase: "one", command: process.execPath, args: ["-e", "console.log('first')"] },
      { phase: "two", command: process.execPath, args: ["-e", "console.log('second')"] },
    ]);

    expect(events.findIndex((event) => event.includes("one:first"))).toBeLessThan(
      events.findIndex((event) => event.includes("two:second")),
    );
  });

  it("stops after the first failed command", async () => {
    const service = new TaskService();
    const events: string[] = [];
    service.subscribe((event) => events.push(event.message));

    await expect(
      service.runPipeline("test", process.cwd(), [
        { phase: "fail", command: process.execPath, args: ["-e", "process.exit(7)"] },
        { phase: "never", command: process.execPath, args: ["-e", "console.log('must-not-run')"] },
      ]),
    ).rejects.toThrow("退出码 7");
    expect(events.join("\n")).not.toContain("must-not-run");
  });

  it("cancels a running command by task id", async () => {
    const service = new TaskService();
    let taskId = "";
    const started = new Promise<void>((resolve) => service.subscribe((event) => {
      taskId = event.taskId;
      if (event.level === "info") resolve();
    }));
    const pipeline = service.runPipeline("cancel", process.cwd(), [
      { phase: "long", command: process.execPath, args: ["-e", "setTimeout(() => {}, 30000)"] },
    ]);
    const rejected = expect(pipeline).rejects.toThrow();
    await started;
    await service.cancel(taskId);
    await rejected;
  });
});

describe("preview port selection", () => {
  it("selects the next port when the preferred port is occupied", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const occupied = (server.address() as { port: number }).port;
    try {
      expect(await findAvailablePort(occupied, occupied + 2)).toBe(occupied + 1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("starts, probes and stops an npm-based preview server", async () => {
    const root = await mkdtemp(join(tmpdir(), "stellar-preview-"));
    await writeFile(join(root, "package.json"), JSON.stringify({
      scripts: { dev: "node server.cjs" },
    }), "utf8");
    await writeFile(join(root, "server.cjs"), `
      const http = require("http");
      const index = process.argv.indexOf("--port");
      const port = Number(process.argv[index + 1]);
      http.createServer((_request, response) => response.end("ok")).listen(port, "127.0.0.1");
    `, "utf8");
    const preview = new PreviewService(root, new TaskService());
    try {
      const state = await preview.start();
      expect(state.status).toBe("running");
      expect(await fetch(state.url!)).toHaveProperty("ok", true);
      await preview.stop();
      expect(preview.current().status).toBe("stopped");
    } finally {
      await preview.stop();
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);
});
