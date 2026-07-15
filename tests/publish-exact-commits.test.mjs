import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const portableGit = "F:\\blog\\.local-tools\\mingit\\cmd\\git.exe";
const git = process.platform === "win32" && existsSync(portableGit) ? portableGit : "git";
const powershell = process.platform === "win32" ? "powershell.exe" : "pwsh";

const runGit = (cwd, ...args) =>
  execFileSync(git, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

test("Git tree parser preserves an exact Chinese path", () => {
  const repository = mkdtempSync(join(tmpdir(), "publisher-unicode-"));
  const expectedPath = "source/_posts/welcome/微信图片_20260711122323_51901_4.png";

  try {
    runGit(repository, "init", "--initial-branch=main");
    runGit(repository, "config", "user.name", "Publisher Test");
    runGit(repository, "config", "user.email", "publisher@example.com");
    mkdirSync(join(repository, "source", "_posts", "welcome"), { recursive: true });
    writeFileSync(join(repository, ...expectedPath.split("/")), Buffer.from([0, 1, 2, 255]));
    runGit(repository, "add", "--", expectedPath);
    runGit(repository, "commit", "-m", "test: add Unicode path");
    const commit = runGit(repository, "rev-parse", "HEAD");

    const stdout = execFileSync(
      powershell,
      [
        "-NoProfile",
        "-NonInteractive",
        ...(process.platform === "win32" ? ["-ExecutionPolicy", "Bypass"] : []),
        "-File",
        join(root, "tools", "git-tree.ps1"),
        "-Git",
        git,
        "-Commit",
        commit,
        "-Json",
      ],
      { cwd: repository, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const parsed = JSON.parse(stdout);
    const entries = Array.isArray(parsed) ? parsed : [parsed];

    assert.equal(entries.length, 1);
    assert.equal(entries[0].path, expectedPath);
    assert.equal(entries[0].type, "blob");
    assert.match(entries[0].sha, /^[0-9a-f]{40}$/);
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});
