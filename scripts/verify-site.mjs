import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

assert.ok(existsSync(new URL("_config.yml", root)), "Hexo _config.yml is missing");
assert.ok(existsSync(new URL("package.json", root)), "package.json is missing");

const config = read("_config.yml");
const packageJson = JSON.parse(read("package.json"));

for (const expected of [
  "title: Jason Xu's Blog",
  "author: Jason Xu",
  "language: zh-CN",
  "url: https://jyxu0621.github.io/blog/",
  "root: /blog/",
]) {
  assert.ok(config.includes(expected), `Missing Hexo setting: ${expected}`);
}

assert.ok(
  packageJson.dependencies?.["hexo-theme-butterfly"],
  "hexo-theme-butterfly dependency is missing",
);

if (process.argv.includes("--generated")) {
  assert.ok(existsSync(new URL("public/index.html", root)), "public/index.html is missing");
}

console.log("Blog verification passed.");
