import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

assert.ok(existsSync(new URL("_config.yml", root)), "Hexo _config.yml is missing");
assert.ok(existsSync(new URL("package.json", root)), "package.json is missing");

const config = read("_config.yml");
const packageJson = JSON.parse(read("package.json"));
const scaffold = read("scaffolds/post.md");
assert.ok(existsSync(new URL("source/_data/widgets.yml", root)), "Stellar widgets are missing");
const widgets = read("source/_data/widgets.yml");

assert.equal(packageJson.hexo?.version, "8.1.2", "Hexo project metadata is missing");

for (const dependency of ["hexo-generator-feed", "hexo-filter-mathjax"]) {
  assert.ok(packageJson.dependencies?.[dependency], `Missing dependency: ${dependency}`);
}
assert.equal(
  packageJson.description,
  "Jason Xu's personal technical blog powered by Hexo and Stellar",
  "Package description still references the old theme",
);

for (const expected of [
  "feed:",
  "type: atom",
  "path: atom.xml",
  "mathjax:",
  "every_page: false",
  "append_css: true",
]) {
  assert.ok(config.includes(expected), `Missing advanced Hexo setting: ${expected}`);
}

assert.ok(scaffold.includes("mathjax: false"), "Post scaffold is missing MathJax opt-in");
assert.ok(
  existsSync(new URL("source/_drafts/mathjax-verification.md", root)),
  "MathJax draft fixture is missing",
);
assert.equal(packageJson.scripts?.["verify:advanced"], "node tests/verify-advanced.mjs");

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
  existsSync(new URL("tools/publish-exact-commits.ps1", root)),
  "Tracked exact-commit publisher is missing",
);
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
  "https://npm.elemecdn.com/lxgw-wenkai-screen-webfont/style.css",
  'body: \'"LXGW WenKai Screen", system-ui, "Microsoft Yahei", "Helvetica Neue", Helvetica, Arial, sans-serif\'',
  'code: \'"LXGW WenKai Screen", Menlo, Monaco, Consolas, system-ui, "Courier New", monospace, sans-serif\'',
  "originalHost: jyxu0621.github.io",
  "service: local_search",
  "codeblock: true",
  "leftbar: [recent, quick_links]",
  "rightbar: [toc, tagcloud]",
  "share: [link]",
  "selector: '.md-text img:not([class]), .md-text .image img, .timenode p>img'",
  "default_text: 复制",
  "success_text: 已复制",
  "swiper:",
  "tianli_gpt:",
  "mermaid:",
]) {
  assert.ok(stellar.includes(expected), `Missing optimized Stellar setting: ${expected}`);
}

for (const expected of [
  "recent:",
  "rss: /blog/atom.xml",
  "quick_links:",
  "title: 快捷入口",
  "url: https://jyxu0621.github.io/",
  "url: https://github.com/jyxu0621",
  "url: /blog/categories/",
  "url: /blog/tags/",
  "tagcloud:",
  "title: 标签云",
  "toc:",
  "max_depth: 4",
]) {
  assert.ok(widgets.includes(expected), `Missing widget setting: ${expected}`);
}

for (const disabled of ["swiper", "scrollreveal", "tianli_gpt", "katex", "mathjax", "mermaid", "heti"]) {
  assert.ok(
    new RegExp(`^  ${disabled}:\\r?\\n    enable: false$`, "m").test(stellar),
    `Unused client plugin must be disabled: ${disabled}`,
  );
}

for (const expected of [
  "service: giscus",
  "lazyload: true",
  "src: https://giscus.app/client.js",
  "data-repo: jyxu0621/blog",
  "data-repo-id: R_kgDOTWpQAA",
  "data-category: Announcements",
  "data-category-id: DIC_kwDOTWpQAM4DBPlT",
  "data-mapping: pathname",
  "data-strict: 1",
  "data-reactions-enabled: 1",
  "data-emit-metadata: 0",
  "data-input-position: top",
  "data-theme: preferred_color_scheme",
  "data-lang: zh-CN",
  "data-loading: lazy",
  "crossorigin: anonymous",
]) {
  assert.ok(stellar.includes(expected), `Missing Giscus setting: ${expected}`);
}

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
  "npm run test:publisher",
  "npm run verify:site",
  "npm run verify:advanced",
  "npm run build",
  "npm run verify:site -- --generated",
]) {
  assert.ok(workflow.includes(expected), `Missing workflow step: ${expected}`);
}
for (const expected of [
  "actions/checkout@v7",
  "actions/setup-node@v7",
  "actions/configure-pages@v6",
  "actions/upload-pages-artifact@v5",
  "actions/deploy-pages@v5",
  "node-version: 24",
]) {
  assert.ok(workflow.includes(expected), `Missing current Pages workflow setting: ${expected}`);
}

const publisher = read("tools/publish-blog.ps1");
assert.equal(
  packageJson.scripts?.["test:publisher"],
  "node --test tests/publish-exact-commits.test.mjs",
);
assert.ok(publisher.includes('$ExactPublisher = Join-Path $PSScriptRoot "publish-exact-commits.ps1"'));
assert.ok(publisher.includes('Invoke-Npm @("run", "test:publisher")'));
assert.ok(publisher.includes('Invoke-Npm @("run", "verify:advanced")'));

if (process.argv.includes("--generated")) {
  assert.ok(existsSync(new URL("public/index.html", root)), "public/index.html is missing");
  assert.ok(existsSync(new URL("public/atom.xml", root)), "Atom feed is missing");
  assert.ok(
    !existsSync(new URL("public/2026/07/15/mathjax-verification/index.html", root)),
    "Draft leaked into production",
  );
  const productionFeed = read("public/atom.xml");
  assert.ok(!productionFeed.includes("MathJax Verification"), "Unpublished draft leaked into production feed");
  const generated = read("public/index.html");
  const generatedPost = read("public/2026/07/13/welcome/index.html");
  const generatedCss = read("public/css/main.css");
  const technicalPost = read("public/2026/07/13/integrated-circuit-notes/index.html");

  assert.ok(
    generated.includes("https://npm.elemecdn.com/lxgw-wenkai-screen-webfont/style.css"),
    "Generated font stylesheet is missing",
  );
  assert.ok(generatedCss.includes("LXGW WenKai Screen"), "Generated CSS font stack is missing");
  assert.ok(generated.includes('class="widget-wrapper linklist"'), "Homepage quick links are missing");
  assert.ok(generated.includes('class="widget-wrapper tagcloud"'), "Homepage tag cloud is missing");
  assert.ok(generated.includes('href="/blog/atom.xml"'), "Homepage feed link is missing");
  assert.ok(technicalPost.includes('class="widget-wrapper toc"'), "Article TOC is missing");
  assert.ok(technicalPost.includes("计划整理的内容"), "Article TOC content is missing");
  for (const unwanted of ["swiper-bundle", "scrollreveal", "chuckle-post-ai", "mermaid.min.js", "MathJax.js"]) {
    assert.ok(!generated.includes(unwanted), `Homepage loads disabled plugin: ${unwanted}`);
  }
  assert.ok(generatedPost.includes('id="giscus"'), "Generated post is missing Giscus container");
  for (const expected of [
    'src="https://giscus.app/client.js"',
    'data-repo="jyxu0621/blog"',
    'data-repo-id="R_kgDOTWpQAA"',
    'data-category="Announcements"',
    'data-category-id="DIC_kwDOTWpQAM4DBPlT"',
    'data-mapping="pathname"',
    'data-strict="1"',
    'data-reactions-enabled="1"',
    'data-emit-metadata="0"',
    'data-input-position="top"',
    'data-theme="preferred_color_scheme"',
    'data-lang="zh-CN"',
    'data-loading="lazy"',
    'crossorigin="anonymous"',
  ]) {
    assert.ok(generatedPost.includes(expected), `Generated Giscus widget is missing: ${expected}`);
  }
  assert.ok(!generated.includes('id="giscus"'), "Homepage must not contain a Giscus widget");
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
  ]) {
    assert.ok(generated.includes(title), `Generated homepage is missing: ${title}`);
  }
  assert.ok((generated.match(/<article/g) ?? []).length >= 4, "Generated homepage has fewer than four cards");
}

console.log("Blog verification passed.");
