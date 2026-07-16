import { join } from "node:path";
import { parseDocument } from "yaml";
import { readFile } from "node:fs/promises";
import { validateProjectConfig } from "../../shared/validation/project-validation";
import { ConfigService } from "./config-service";
import { TaskService, type CommandSpec } from "./task-service";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export class ValidationService {
  constructor(
    private readonly root: string,
    private readonly tasks: TaskService,
  ) {}

  async validateSource(): Promise<void> {
    const config = new ConfigService(this.root);
    const [hexo, stellar, widgets, packageSource] = await Promise.all([
      config.read("hexo"),
      config.read("stellar"),
      config.read("widgets"),
      readFile(join(this.root, "package.json"), "utf8"),
    ]);
    const packageJson = JSON.parse(packageSource) as { dependencies?: Record<string, string> };
    const result = validateProjectConfig(
      hexo.effective,
      stellar.effective,
      widgets.effective,
      Boolean(packageJson.dependencies?.["hexo-filter-mathjax"]),
    );
    if (!result.valid) throw new Error(result.issues.map((issue) => issue.message).join("\n"));
    for (const source of [hexo.source, stellar.source, widgets.source]) {
      const document = parseDocument(source);
      if (document.errors.length) throw document.errors[0];
    }
  }

  async runBuildPipeline(): Promise<string> {
    await this.validateSource();
    const scripts = [
      ["检查本地封面", ["run", "test:local-cover"]],
      ["验证站点源码", ["run", "verify:site"]],
      ["验证高级功能", ["run", "verify:advanced"]],
      ["清理生成目录", ["run", "clean"]],
      ["构建博客", ["run", "build"]],
      ["验证生成结果", ["run", "verify:site", "--", "--generated"]],
    ] as const;
    const commands: CommandSpec[] = scripts.map(([phase, args]) => ({ phase, command: npmCommand, args: [...args] }));
    return this.tasks.runPipeline("validate", this.root, commands);
  }
}
