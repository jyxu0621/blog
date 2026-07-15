import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const root = fileURLToPath(rootUrl);
const hexoBin = fileURLToPath(new URL("../node_modules/hexo/bin/hexo", import.meta.url));
const read = (path) => readFileSync(new URL(path, rootUrl), "utf8");

const runHexo = (args) => {
  const result = spawnSync(process.execPath, [hexoBin, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`hexo ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
};

try {
  runHexo(["clean"]);
  runHexo(["generate", "--draft"]);

  const draftPath = "public/2026/07/15/mathjax-verification/index.html";
  assert.ok(existsSync(new URL(draftPath, rootUrl)), "MathJax draft was not generated");
  const draft = read(draftPath);
  assert.ok(draft.includes("<mjx-container"), "Formula was not rendered by server-side MathJax");
  assert.ok(!draft.includes("MathJax.js"), "Draft loads duplicate client-side MathJax");
  assert.ok(!draft.includes("katex.min.css"), "Draft loads duplicate KaTeX assets");

  assert.ok(existsSync(new URL("public/atom.xml", rootUrl)), "Draft build did not generate Atom feed");
  const feed = read("public/atom.xml");
  assert.ok(feed.includes("Jason Xu&apos;s Blog") || feed.includes("Jason Xu's Blog"));

  console.log("Advanced blog verification passed.");
} finally {
  runHexo(["clean"]);
}
