import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const portableGit = "F:\\blog\\.local-tools\\mingit\\cmd\\git.exe";
const git = process.platform === "win32" && existsSync(portableGit) ? portableGit : "git";
const powershell = process.platform === "win32" ? "powershell.exe" : "pwsh";

const runGit = (cwd, ...args) =>
  execFileSync(git, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const powerShellString = (value) => `'${value.replaceAll("'", "''")}'`;
const replaceRequired = (source, expected, replacement) => {
  assert.ok(source.includes(expected), `Test harness could not replace: ${expected}`);
  return source.replace(expected, replacement);
};

test("Git tree parser rejects an unsafe commit argument before starting Git", () => {
  for (const unsafeCommit of ["not-a-sha", `${"a".repeat(40)}\n`]) {
    const result = spawnSync(
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
        unsafeCommit,
        "-Json",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );

    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /Commit SHA must be exactly 40 or 64 hexadecimal characters/,
    );
  }
});

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

test("publisher sends every API JSON payload to native gh as BOM-less UTF-8", () => {
  const repository = mkdtempSync(join(tmpdir(), "publisher-payload-"));
  const captureDir = join(repository, "captures");
  const fakeGhScript = join(repository, "fake-gh.mjs");
  const fakeGh = join(repository, process.platform === "win32" ? "fake-gh.cmd" : "fake-gh");
  const publisherCopy = join(repository, "publish-exact-commits.ps1");
  const expectedPath = "source/中文图片.png";
  const expectedName = "发布者测试";
  const expectedMessage = "提交中文";

  try {
    mkdirSync(captureDir);
    writeFileSync(
      fakeGhScript,
      `import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const endpoint = args.find((arg) => arg.startsWith("repos/")) ?? "";
const hasInput = args.includes("--input");
let body = Buffer.alloc(0);
if (hasInput) {
  body = readFileSync(0);
  const kind = endpoint.includes("/git/blobs") ? "blob"
    : endpoint.includes("/git/trees") ? "tree"
      : endpoint.includes("/git/commits") ? "commit" : "ref";
  writeFileSync(join(process.env.FAKE_CAPTURE_DIR, kind + ".bin"), body);
}

if (!hasInput) {
  process.stdout.write(process.env.FAKE_REMOTE_SHA);
} else if (endpoint.includes("/git/blobs")) {
  const payload = JSON.parse(body.toString("utf8"));
  const content = Buffer.from(payload.content, "base64");
  const header = Buffer.from("blob " + content.length + "\\0");
  process.stdout.write(createHash("sha1").update(header).update(content).digest("hex"));
} else if (endpoint.includes("/git/trees")) {
  process.stdout.write(process.env.FAKE_TREE_SHA);
} else {
  process.stdout.write(process.env.FAKE_COMMIT_SHA);
}
`,
      "utf8",
    );

    if (process.platform === "win32") {
      writeFileSync(fakeGh, `@echo off\r\n"${process.execPath}" "${fakeGhScript}" %*\r\n`, "utf8");
    } else {
      writeFileSync(fakeGh, `#!/bin/sh\nexec "${process.execPath}" "${fakeGhScript}" "$@"\n`, "utf8");
      chmodSync(fakeGh, 0o755);
    }

    runGit(repository, "init", "--initial-branch=main");
    runGit(repository, "config", "user.name", "Publisher Base");
    runGit(repository, "config", "user.email", "publisher@example.com");
    runGit(repository, "commit", "--allow-empty", "-m", "base");
    const remoteSha = runGit(repository, "rev-parse", "HEAD");
    runGit(repository, "config", "user.name", expectedName);
    mkdirSync(join(repository, "source"));
    writeFileSync(join(repository, expectedPath), "payload", "utf8");
    runGit(repository, "add", "--", expectedPath);
    runGit(repository, "commit", "-m", expectedMessage);
    const commitSha = runGit(repository, "rev-parse", "HEAD");
    const treeSha = runGit(repository, "show", "-s", "--format=%T", "HEAD");

    let publisherSource = readFileSync(join(root, "tools", "publish-exact-commits.ps1"), "utf8");
    publisherSource = replaceRequired(
      publisherSource,
      '$gh = "F:\\blog\\.local-tools\\gh\\bin\\gh.exe"',
      `$gh = ${powerShellString(fakeGh)}`,
    );
    publisherSource = replaceRequired(
      publisherSource,
      '$git = "F:\\blog\\.local-tools\\mingit\\cmd\\git.exe"',
      `$git = ${powerShellString(git)}`,
    );
    publisherSource = replaceRequired(
      publisherSource,
      '$gitTree = Join-Path $PSScriptRoot "git-tree.ps1"',
      `$gitTree = ${powerShellString(join(root, "tools", "git-tree.ps1"))}`,
    );
    publisherSource = replaceRequired(
      publisherSource,
      '$ErrorActionPreference = "Stop"',
      '$ErrorActionPreference = "Stop"\nRemove-Item Env:TEMP -ErrorAction SilentlyContinue',
    );
    writeFileSync(publisherCopy, publisherSource, "utf8");

    const publisherEnv = {
      ...process.env,
      FAKE_CAPTURE_DIR: captureDir,
      FAKE_REMOTE_SHA: remoteSha,
      FAKE_TREE_SHA: treeSha,
      FAKE_COMMIT_SHA: commitSha,
    };
    for (const key of Object.keys(publisherEnv)) {
      if (key.toUpperCase() === "TEMP") delete publisherEnv[key];
    }

    execFileSync(
      powershell,
      [
        "-NoProfile",
        "-NonInteractive",
        ...(process.platform === "win32" ? ["-ExecutionPolicy", "Bypass"] : []),
        "-File",
        publisherCopy,
        "-Repository",
        "test/repository",
      ],
      {
        cwd: repository,
        env: publisherEnv,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.deepEqual(readdirSync(captureDir).sort(), ["blob.bin", "commit.bin", "ref.bin", "tree.bin"]);
    const payloads = Object.fromEntries(
      ["blob", "tree", "commit", "ref"].map((kind) => {
        const bytes = readFileSync(join(captureDir, `${kind}.bin`));
        assert.notDeepEqual(bytes.subarray(0, 3), Buffer.from([0xef, 0xbb, 0xbf]), `${kind} has a BOM`);
        return [kind, JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))];
      }),
    );
    assert.equal(payloads.tree.tree[0].path, expectedPath);
    assert.equal(payloads.commit.message.trim(), expectedMessage);
    assert.equal(payloads.commit.author.name, expectedName);
    assert.equal(payloads.commit.committer.name, expectedName);
    assert.equal(payloads.ref.force, false);
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});
