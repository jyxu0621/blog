import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

assert.ok(existsSync(new URL("_config.yml", root)), "Hexo _config.yml is missing");
assert.ok(existsSync(new URL("package.json", root)), "package.json is missing");

const config = read("_config.yml");
const packageJson = JSON.parse(read("package.json"));
const scaffold = read("scaffolds/post.md");

assert.equal(packageJson.hexo?.version, "8.1.2", "Hexo project metadata is missing");

for (const expected of [
  "title: Jason Xu's Blog",
  "author: Jason Xu",
  "language: zh-CN",
  "url: https://jyxu0621.github.io/blog/",
  "root: /blog/",
  "theme: stellar",
  "post_asset_folder: true",
]) {
  assert.ok(config.includes(expected), `Missing Hexo setting: ${expected}`);
}

for (const field of ["description:", "cover:"]) {
  assert.ok(scaffold.includes(field), `Post scaffold is missing ${field}`);
}

assert.ok(existsSync(new URL("lib/local-cover.cjs", root)), "Local cover resolver is missing");
assert.ok(existsSync(new URL("scripts/local-cover.js", root)), "Hexo local cover adapter is missing");
assert.ok(existsSync(new URL("tools/publish-blog.ps1", root)), "HexoHub publish script is missing");
assert.ok(
  !existsSync(new URL("scripts/publish-blog.ps1", root)),
  "PowerShell files in scripts/ are incorrectly loaded by Hexo as JavaScript",
);

assert.ok(
  packageJson.dependencies?.["hexo-theme-stellar"],
  "hexo-theme-stellar dependency is missing",
);
assert.ok(
  !packageJson.dependencies?.["hexo-theme-butterfly"],
  "Butterfly dependency must be removed",
);
assert.ok(existsSync(new URL("_config.stellar.yml", root)), "Stellar config is missing");
assert.ok(
  !existsSync(new URL("_config.butterfly.yml", root)),
  "Butterfly config must be removed",
);
assert.ok(existsSync(new URL("source/_posts/welcome.md", root)), "Welcome post is missing");

const stellar = read("_config.stellar.yml");
const welcome = read("source/_posts/welcome.md");

for (const expected of [
  "columns: 4",
  "title: 博客",
  "title: 项目",
  "title: 探索",
  "title: 社交",
  "theme: '#1BCDFC'",
  "theme: '#3DC550'",
  "theme: '#FA6400'",
  "theme: '#F44336'",
  "url: /categories/项目实践/",
]) {
  assert.ok(stellar.includes(expected), `Missing xaoxuu-style menubar setting: ${expected}`);
}

const starterPosts = [
  "source/_posts/welcome.md",
  "source/_posts/integrated-circuit-notes.md",
  "source/_posts/course-notes-plan.md",
  "source/_posts/project-practice-log.md",
];
for (const post of starterPosts) {
  assert.ok(existsSync(new URL(post, root)), `Starter post is missing: ${post}`);
  const body = read(post);
  for (const field of ["cover:", "categories:", "tags:", "description:"]) {
    assert.ok(body.includes(field), `${post} is missing ${field}`);
  }
}

for (const expected of [
  "Jason Xu's Blog",
  "https://github.com/jyxu0621.png",
  "url: /archives/",
  "url: https://github.com/jyxu0621",
]) {
  assert.ok(stellar.includes(expected), `Missing Stellar setting: ${expected}`);
}
for (const expected of ["rightbar:", "layout: markdown", "欢迎来到这里", "/categories/", "/tags/"]) {
  assert.ok(stellar.includes(expected), `Missing rich homepage setting: ${expected}`);
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
  assert.ok(generated.includes('href="/blog/'), "Generated internal links are not rooted at /blog/");
  assert.ok(!generated.includes('href="/"'), "Generated site contains a root-only internal link");
  assert.ok(generated.includes("/blog/css/main.css"), "Generated Stellar stylesheet is missing");
  assert.ok(
    !generated.includes(">solar:"),
    "Generated navigation contains unresolved Stellar icon keys",
  );
  const menu = generated.match(/<nav class="menu dis-select">.*?<\/nav>/s)?.[0] ?? "";
  assert.equal((menu.match(/class="nav-item/g) ?? []).length, 4, "Generated menubar must have four items");
  assert.equal((menu.match(/<svg/g) ?? []).length, 4, "Generated menubar must have four SVG icons");
  for (const expected of [
    'title="博客"',
    'title="项目"',
    'title="探索"',
    'title="社交"',
    'style="color:#1BCDFC"',
    'style="color:#3DC550"',
    'style="color:#FA6400"',
    'style="color:#F44336"',
  ]) {
    assert.ok(menu.includes(expected), `Generated menubar is missing: ${expected}`);
  }
  for (const title of [
    "欢迎来到 Jason Xu's Blog",
    "数字与混合信号集成电路学习笔记",
    "课程笔记整理计划",
    "项目实践记录",
    "欢迎来到这里",
  ]) {
    assert.ok(generated.includes(title), `Generated homepage is missing: ${title}`);
  }
  assert.ok((generated.match(/<article/g) ?? []).length >= 4, "Generated homepage has fewer than four cards");
}

console.log("Blog verification passed.");
