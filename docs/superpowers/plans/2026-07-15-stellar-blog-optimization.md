# Stellar Blog Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize Jason Xu's Stellar blog for long-term publishing with xaoxuu typography, reusable sidebars, maintained feed/formula support, lean plugins, and warning-free GitHub Pages deployment.

**Architecture:** Keep Hexo 8.1.2 and Stellar 1.33.1 unmodified, expressing all visual and behavioral changes through site configuration and `source/_data/widgets.yml`. Add only two maintained server-side Hexo packages, verify the optional MathJax path through an unpublished draft, and keep the normal production build free of drafts and unused client scripts.

**Tech Stack:** Hexo 8.1.2, hexo-theme-stellar 1.33.1, LXGW WenKai Screen, hexo-generator-feed 4.x, hexo-filter-mathjax 0.11.x, Node.js 24, GitHub Actions Pages.

## Global Constraints

- The public blog URL remains `https://jyxu0621.github.io/blog/`; all existing article URLs remain unchanged.
- Preserve the current four-button menubar, existing posts/assets, local-cover behavior, Giscus settings, and GitHub Discussions data.
- Use Stellar native config/widgets/plugins; do not fork or patch files under `node_modules/hexo-theme-stellar`.
- Match xaoxuu.com's `LXGW WenKai Screen` stylesheet and font stacks with system fallbacks.
- Install only `hexo-generator-feed@^4.0.0` and `hexo-filter-mathjax@^0.11.0`.
- MathJax is server-rendered only for posts with `mathjax: true`; theme-side MathJax and KaTeX remain disabled.
- Do not install Mermaid, Memos, Tianli GPT, Swiper content, ScrollReveal, Heti, or a related-post plugin.
- Store no token, key, private API endpoint, personal domain, Cloudflare setting, server, or database.
- Do not create, edit, react to, moderate, or delete any Giscus comment.
- Push only reviewed commits to `main`; deployment remains GitHub Pages Actions.

---

## File Structure

- Modify `_config.stellar.yml`: complete theme, sidebar, font, search, metadata, footer, plugin, and existing Giscus configuration.
- Create `source/_data/widgets.yml`: reusable `recent`, `quick_links`, `tagcloud`, and `toc` components.
- Modify `tests/verify-site.mjs`: source and generated regression checks for all optimization settings.
- Modify `_config.yml`: Atom feed and server-side MathJax filter settings.
- Modify `package.json` and `package-lock.json`: two dependencies and `verify:advanced` command.
- Modify `scaffolds/post.md`: make formula support a one-field authoring choice.
- Create `source/_drafts/mathjax-verification.md`: unpublished formula smoke fixture.
- Create `tests/verify-advanced.mjs`: draft MathJax/Atom verification with cleanup.
- Modify `tools/publish-blog.ps1`: run advanced verification before production generation.
- Modify `.github/workflows/deploy-pages.yml`: run advanced verification and use Node 24 action majors.

---

### Task 1: Optimize Stellar Typography, Sidebars, Search, and Lean Client Plugins

**Files:**
- Modify: `tests/verify-site.mjs`
- Modify: `_config.stellar.yml`
- Create: `source/_data/widgets.yml`

**Interfaces:**
- Produces four named widgets: `recent`, `quick_links`, `tagcloud`, `toc`.
- Preserves existing Giscus public parameters exactly.
- Produces a generated font link, widget containers, local search config, and client-plugin allowlist for later deployment tests.

- [ ] **Step 1: Add failing source assertions**

After `const scaffold = ...` in `tests/verify-site.mjs`, add:

```js
assert.ok(existsSync(new URL("source/_data/widgets.yml", root)), "Stellar widgets are missing");
const widgets = read("source/_data/widgets.yml");
```

After reading `_config.stellar.yml`, add:

```js
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
```

- [ ] **Step 2: Run the source verification and confirm RED**

Run:

```powershell
npm run verify:site
```

Expected: FAIL with `Stellar widgets are missing`.

- [ ] **Step 3: Create the widget library**

Create `source/_data/widgets.yml` exactly as follows:

```yaml
recent:
  layout: recent
  rss: /blog/atom.xml
  limit: 5

quick_links:
  layout: linklist
  title: 快捷入口
  columns: 2
  items:
    - icon: jason:blog
      title: 个人主页
      url: https://jyxu0621.github.io/
    - icon: jason:social
      title: GitHub
      url: https://github.com/jyxu0621
    - icon: jason:projects
      title: 分类
      url: /blog/categories/
    - icon: jason:explore
      title: 标签
      url: /blog/tags/

tagcloud:
  layout: tagcloud
  title: 标签云
  min_font: 13
  max_font: 20
  amount: 30
  orderby: name
  order: 1
  color: false
  show_count: false

toc:
  layout: toc
  list_number: false
  min_depth: 2
  max_depth: 4
  fallback: recent
  collapse: auto
```

- [ ] **Step 4: Replace the Stellar override with the complete optimized configuration**

Replace `_config.stellar.yml` with:

```yaml
preconnect:
  - https://npm.elemecdn.com

inject:
  head:
    - "<link rel=\"stylesheet\" href=\"https://npm.elemecdn.com/lxgw-wenkai-screen-webfont/style.css\" media=\"print\" onload=\"this.media='all'\">"
    - '<noscript><link rel="stylesheet" href="https://npm.elemecdn.com/lxgw-wenkai-screen-webfont/style.css"></noscript>'

canonical:
  originalHost: jyxu0621.github.io
  officialHosts:
    - localhost

open_graph:
  enable: true

structured_data:
  links:
    - https://github.com/jyxu0621
    - https://jyxu0621.github.io/
    - https://jyxu0621.github.io/blog/

logo:
  avatar: '[https://github.com/jyxu0621.png](/blog/)'
  title: "[Jason Xu's Blog](/blog/)"
  subtitle: 记录技术学习与项目实践 | 数字与混合信号集成电路

menubar:
  columns: 4
  items:
    - id: home
      icon: jason:blog
      title: 博客
      url: /
      theme: '#1BCDFC'
    - id: projects
      icon: jason:projects
      title: 项目
      url: /categories/项目实践/
      theme: '#3DC550'
    - id: explore
      icon: jason:explore
      title: 探索
      url: /archives/
      theme: '#FA6400'
    - id: social
      icon: jason:social
      title: 社交
      url: https://github.com/jyxu0621
      theme: '#F44336'

site_tree:
  home:
    menu_id: home
    leftbar: [recent, quick_links]
    rightbar: [tagcloud]
  index_blog:
    menu_id: home
    leftbar: [recent, quick_links]
    rightbar: [tagcloud]
    nav_tabs:
      近期发布: /
      分类: /categories/
      标签: /tags/
      归档: /archives/
  post:
    menu_id: home
    leftbar: [recent, quick_links]
    rightbar: [toc, tagcloud]
  page:
    menu_id: home
    leftbar: [recent, quick_links]
    rightbar: [toc]
  error_page:
    menu_id: home
    '404': /404.html
    leftbar: [recent]

article:
  type: tech
  auto_excerpt: 128
  license: '本文采用 [署名-非商业性使用-相同方式共享 4.0 国际](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可协议，转载请注明出处。'
  share: [link]
  related_posts:
    enable: false
    max_count: 5

search:
  service: local_search
  local_search:
    field: all
    path: /search.json
    content: true
    skip_search: []
    codeblock: true

footer:
  sitemap:
    - title: 博客
      items:
        - '[近期发布](/blog/)'
        - '[分类](/blog/categories/)'
        - '[标签](/blog/tags/)'
        - '[归档](/blog/archives/)'
    - title: Jason Xu
      items:
        - '[个人主页](https://jyxu0621.github.io/)'
        - '[GitHub](https://github.com/jyxu0621)'
        - '[Atom 订阅](/blog/atom.xml)'
  content: |
    本站由 [Jason Xu](/blog/) 使用 [Stellar](https://github.com/xaoxuu/hexo-theme-stellar) 主题创建。
    本博客所有文章除特别声明外，均采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可协议。

tag_plugins:
  image:
    fancybox: true
  copy:
    toast: 复制成功

plugins:
  preload:
    enable: true
    service: flying_pages
    flying_pages: https://gcore.jsdelivr.net/npm/flying-pages@2/flying-pages.min.js
  fancybox:
    enable: true
    loader: /js/plugins/fancybox-loader.js
    js: https://gcore.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js
    css: https://gcore.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css
    selector: '.md-text img:not([class]), .md-text .image img, .timenode p>img'
  swiper:
    enable: false
  scrollreveal:
    enable: false
  tianli_gpt:
    enable: false
  katex:
    enable: false
  mathjax:
    enable: false
  mermaid:
    enable: false
    style_optimization: false
  copycode:
    enable: true
    default_text: 复制
    success_text: 已复制
    toast: 复制成功
  heti:
    enable: false

style:
  prefers_theme: auto
  smooth_scroll: true
  font-size:
    root: 16px
    body: 17px
    code: 85%
    codeblock: 0.8125rem
  font-family:
    body: '"LXGW WenKai Screen", system-ui, "Microsoft Yahei", "Helvetica Neue", Helvetica, Arial, sans-serif'
    code: '"LXGW WenKai Screen", Menlo, Monaco, Consolas, system-ui, "Courier New", monospace, sans-serif'
    codeblock: '"LXGW WenKai Screen", Menlo, Monaco, Consolas, system-ui, "Courier New", monospace, sans-serif'
  leftbar:
    background-color: var(--card)
    background-image: url(https://gcore.jsdelivr.net/gh/cdn-x/placeholder@1.0.13/image/sidebar-bg1@small.jpg)
    blur-px: 100px
    blur-bg: var(--bg-a60)
    background-opacity: 0.8

comments:
  service: giscus
  comment_title: 快来参与讨论吧~
  lazyload: true
  giscus:
    src: https://giscus.app/client.js
    data-repo: jyxu0621/blog
    data-repo-id: R_kgDOTWpQAA
    data-category: Announcements
    data-category-id: DIC_kwDOTWpQAM4DBPlT
    data-mapping: pathname
    data-strict: 1
    data-reactions-enabled: 1
    data-emit-metadata: 0
    data-input-position: top
    data-theme: preferred_color_scheme
    data-lang: zh-CN
    data-loading: lazy
    crossorigin: anonymous
```

- [ ] **Step 5: Run source verification and confirm GREEN**

Run:

```powershell
npm run verify:site
```

Expected: `Blog verification passed.`

- [ ] **Step 6: Add generated-layout assertions**

Inside the `--generated` block in `tests/verify-site.mjs`, add:

```js
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
```

- [ ] **Step 7: Build and run generated verification**

Run:

```powershell
npm run clean
npm run build
npm run verify:site -- --generated
npm run test:local-cover
& 'F:\blog\.local-tools\mingit\cmd\git.exe' diff --check
```

Expected: build generates 50 files, site verification passes, 4/4 local-cover tests pass, and whitespace check is clean.

- [ ] **Step 8: Commit Task 1**

Run:

```powershell
$git = 'F:\blog\.local-tools\mingit\cmd\git.exe'
& $git add -- _config.stellar.yml source/_data/widgets.yml tests/verify-site.mjs
& $git commit -m "feat: optimize Stellar layout and typography"
```

---

### Task 2: Add Maintained Atom Feed and Server-Side MathJax Authoring

**Files:**
- Modify: `tests/verify-site.mjs`
- Modify: `_config.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `scaffolds/post.md`
- Create: `source/_drafts/mathjax-verification.md`
- Create: `tests/verify-advanced.mjs`
- Modify: `tools/publish-blog.ps1`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Produces `/blog/atom.xml` in normal builds.
- Produces `npm run verify:advanced`, which builds drafts, verifies server-rendered MathJax and Atom, and cleans generated files in `finally`.
- Normal production builds must exclude `mathjax-verification`.

- [ ] **Step 1: Add failing dependency/config/scaffold assertions**

In `tests/verify-site.mjs`, add:

```js
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
```

In the generated block, add:

```js
assert.ok(existsSync(new URL("public/atom.xml", root)), "Atom feed is missing");
assert.ok(!existsSync(new URL("public/2026/07/15/mathjax-verification/index.html", root)), "Draft leaked into production");
const productionFeed = read("public/atom.xml");
assert.ok(!productionFeed.includes("MathJax Verification"), "Unpublished draft leaked into production feed");
```

- [ ] **Step 2: Run source verification and confirm RED**

Run `npm run verify:site`.

Expected: FAIL with `Missing dependency: hexo-generator-feed`.

- [ ] **Step 3: Install the two approved dependencies**

Run:

```powershell
npm install --save hexo-generator-feed@^4.0.0 hexo-filter-mathjax@^0.11.0
```

Expected: `package.json` contains both packages, `package-lock.json` updates, and npm reports zero vulnerabilities.

- [ ] **Step 4: Configure feed and server-side MathJax**

Append to `_config.yml`:

```yaml
feed:
  type: atom
  path: atom.xml
  limit: 20
  hub:
  content: true
  content_limit: false
  order_by: -date
  autodiscovery: true

mathjax:
  tags: none
  single_dollars: true
  cjk_width: 0.9
  normal_width: 0.6
  append_css: true
  every_page: false
  packages: []
  extension_options: {}
```

- [ ] **Step 5: Update the post scaffold and add the unpublished fixture**

Replace `scaffolds/post.md` with:

```markdown
---
title: {{ title }}
date: {{ date }}
tags:
categories:
description:
cover:
mathjax: false
---
```

Create `source/_drafts/mathjax-verification.md`:

```markdown
---
title: MathJax Verification
date: 2026-07-15 00:00:00
mathjax: true
comments: false
indexing: false
---

Inline formula: $E=mc^2$.

$$
V=IR
$$
```

- [ ] **Step 6: Create the advanced verifier**

Create `tests/verify-advanced.mjs`:

```js
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
```

- [ ] **Step 7: Add the npm command and run RED/GREEN**

Set the `package.json` description and add the verification script:

```json
"description": "Jason Xu's personal technical blog powered by Hexo and Stellar",
"verify:advanced": "node tests/verify-advanced.mjs"
```

Run:

```powershell
npm run verify:site
npm run verify:advanced
```

Expected: source verification passes; advanced verification prints `Advanced blog verification passed.` and leaves no `public` directory.

- [ ] **Step 8: Put advanced verification into both deployment paths**

In `tools/publish-blog.ps1`, immediately after `Invoke-Npm @("run", "verify:site")`, add:

```powershell
Invoke-Npm @("run", "verify:advanced")
```

In `.github/workflows/deploy-pages.yml`, immediately after `Verify source`, add:

```yaml
      - name: Verify feed and MathJax draft
        run: npm run verify:advanced
```

In `tests/verify-site.mjs`, add `"npm run verify:advanced"` to the workflow expected-string array and assert the publisher contains it:

```js
const publisher = read("tools/publish-blog.ps1");
assert.ok(publisher.includes('Invoke-Npm @("run", "verify:advanced")'));
```

- [ ] **Step 9: Verify production excludes drafts**

Run:

```powershell
npm run verify:advanced
npm run clean
npm run build
npm run verify:site -- --generated
npm run test:local-cover
& 'F:\blog\.local-tools\mingit\cmd\git.exe' diff --check
```

Expected: advanced verification passes, normal build generates `atom.xml`, production verification proves the draft is absent, 4/4 local-cover tests pass, and whitespace is clean.

- [ ] **Step 10: Commit Task 2**

Run:

```powershell
$git = 'F:\blog\.local-tools\mingit\cmd\git.exe'
& $git add -- _config.yml package.json package-lock.json scaffolds/post.md source/_drafts/mathjax-verification.md tests/verify-advanced.mjs tests/verify-site.mjs tools/publish-blog.ps1 .github/workflows/deploy-pages.yml
& $git commit -m "feat: add feed and server-side MathJax"
```

---

### Task 3: Upgrade GitHub Pages Actions to Node 24 Majors

**Files:**
- Modify: `tests/verify-site.mjs`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Preserves the current Node.js `24`, Pages permissions, artifact path, and build/deploy job split.
- Produces a workflow without the Node 20 action deprecation warning.

- [ ] **Step 1: Update workflow-version tests first**

Replace the old action strings in `tests/verify-site.mjs` with:

```js
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
```

- [ ] **Step 2: Run source verification and confirm RED**

Run `npm run verify:site`.

Expected: FAIL with `Missing current Pages workflow setting: actions/checkout@v7`.

- [ ] **Step 3: Upgrade the workflow actions**

In `.github/workflows/deploy-pages.yml`, replace only these five `uses` values:

```yaml
uses: actions/checkout@v7
uses: actions/setup-node@v7
uses: actions/configure-pages@v6
uses: actions/upload-pages-artifact@v5
uses: actions/deploy-pages@v5
```

- [ ] **Step 4: Run complete local verification**

Run:

```powershell
npm run verify:site
npm run verify:advanced
npm run clean
npm run build
npm run verify:site -- --generated
npm run test:local-cover
& 'F:\blog\.local-tools\mingit\cmd\git.exe' diff --check
```

Expected: every command exits 0 and both verifiers print their pass message.

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
$git = 'F:\blog\.local-tools\mingit\cmd\git.exe'
& $git add -- .github/workflows/deploy-pages.yml tests/verify-site.mjs
& $git commit -m "ci: upgrade Pages actions for Node 24"
```

---

### Task 4: Publish and Verify the Optimized Blog

**Files:**
- No planned source changes; use the existing publisher and committed implementation.

**Interfaces:**
- Produces the optimized public site at `https://jyxu0621.github.io/blog/` and Atom feed at `https://jyxu0621.github.io/blog/atom.xml`.

- [ ] **Step 1: Run validation-only publishing**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File F:\blog-site\tools\publish-blog.ps1 -DryRun
```

Expected: local-cover, source, advanced, build, generated verification, and whitespace validation pass; no commit or push occurs.

- [ ] **Step 2: Publish**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File F:\blog-site\tools\publish-blog.ps1
```

Expected: exact local commits reach `main`, the new Pages workflow succeeds, and the publisher reports HTTP 200.

- [ ] **Step 3: Verify repository and Actions state**

Confirm local HEAD equals `refs/heads/main`, worktree is clean, the Pages run head SHA equals HEAD, both jobs succeed, and no Node 20 deprecation annotations remain.

- [ ] **Step 4: Verify live routes and assets**

Check HTTP 200 for:

```text
https://jyxu0621.github.io/blog/
https://jyxu0621.github.io/blog/2026/07/13/integrated-circuit-notes/
https://jyxu0621.github.io/blog/categories/
https://jyxu0621.github.io/blog/tags/
https://jyxu0621.github.io/blog/archives/
https://jyxu0621.github.io/blog/atom.xml
https://npm.elemecdn.com/lxgw-wenkai-screen-webfont/style.css
```

Verify only article pages contain Giscus, the feed contains published articles but not `MathJax Verification`, and no static asset is rooted outside `/blog/`.

- [ ] **Step 5: Verify desktop and mobile visuals**

At desktop `1440x900` and mobile `390x844`, capture the homepage and integrated-circuit article. Confirm:

- `LXGW WenKai Screen` is the computed body font when the CDN is available.
- Menubar, recent posts, quick links, tag cloud, TOC, footer sitemap, and Giscus fit without horizontal overflow.
- Mobile uses the narrow single-column layout and floating sidebar controls remain usable.
- No disabled plugin script appears in the network/DOM.
- Do not interact with any existing Giscus comment.

- [ ] **Step 6: Report evidence**

Report commit SHA, Actions URL/conclusion/annotations, live URLs, font computed style, screenshot artifact paths and hashes, feed verification, plugin allowlist/denylist verification, and that no comment was created or modified.
