import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

assert.ok(existsSync(new URL("_config.yml", root)), "Hexo _config.yml is missing");
assert.ok(existsSync(new URL("package.json", root)), "package.json is missing");

const config = read("_config.yml");
const packageJson = JSON.parse(read("package.json"));

assert.equal(packageJson.hexo?.version, "8.1.2", "Hexo project metadata is missing");

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

assert.ok(existsSync(new URL("_config.butterfly.yml", root)), "Butterfly config is missing");
assert.ok(existsSync(new URL("source/_posts/welcome.md", root)), "Welcome post is missing");

const butterfly = read("_config.butterfly.yml");
const welcome = read("source/_posts/welcome.md");

for (const expected of [
  "首页: / || fas fa-home",
  "归档: /archives/ || fas fa-archive",
  "个人主页: https://jyxu0621.github.io/ || fas fa-user",
]) {
  assert.ok(butterfly.includes(expected), `Missing Butterfly menu entry: ${expected}`);
}

assert.ok(
  welcome.includes("title: 欢迎来到 Jason Xu's Blog"),
  "Welcome post title is missing",
);

assert.ok(
  existsSync(new URL(".github/workflows/deploy-pages.yml", root)),
  "GitHub Pages workflow is missing",
);
const workflow = read(".github/workflows/deploy-pages.yml");
for (const expected of [
  "npm ci --ignore-scripts",
  "npm run verify:site",
  "npm run build",
  "npm run verify:site -- --generated",
  "actions/upload-pages-artifact@v3",
  "actions/deploy-pages@v4",
]) {
  assert.ok(workflow.includes(expected), `Missing workflow step: ${expected}`);
}

if (process.argv.includes("--generated")) {
  assert.ok(existsSync(new URL("public/index.html", root)), "public/index.html is missing");
  const generated = read("public/index.html");
  assert.ok(
    generated.includes("Jason Xu&#39;s Blog") || generated.includes("Jason Xu's Blog"),
    "Generated title is missing",
  );
  assert.ok(
    generated.includes('href="/blog/'),
    "Generated internal links are not rooted at /blog/",
  );
}

console.log("Blog verification passed.");
