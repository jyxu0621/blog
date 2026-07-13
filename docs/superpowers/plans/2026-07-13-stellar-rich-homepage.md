# Stellar Rich Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the one-post Stellar homepage into a content-rich native Stellar blog homepage inspired by `https://xaoxuu.com/`.

**Architecture:** Keep Hexo's standard index generator and Stellar's native post-card layout. Add three honest starter posts, enrich the existing welcome post, and configure a native Markdown rightbar widget through `_config.stellar.yml`; do not add custom templates or CSS.

**Tech Stack:** Hexo 8.1.2, hexo-theme-stellar 1.33.1, Markdown front matter, Node.js verifier, GitHub Pages

## Global Constraints

- Public URL remains `https://jyxu0621.github.io/blog/` with `root: /blog/`.
- Use Stellar-native layouts and widgets only; no custom HTML/CSS redesign.
- Starter posts are frameworks and plans, not claims of completed work.
- Comments, analytics, external search, custom domains, and Cloudflare remain out of scope.
- Internal links must stay below `/blog/`; the personal homepage is the only intentional root-site link.

---

### Task 1: Encode the rich-homepage contract

**Files:**
- Modify: `tests/verify-site.mjs`

**Interfaces:**
- Consumes: source posts, `_config.stellar.yml`, generated `public/index.html`.
- Produces: source and generated verification for four article cards and the welcome widget.

- [ ] **Step 1: Add failing source assertions**

Require these files:

```js
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
```

Require `_config.stellar.yml` to contain `rightbar:`, `layout: markdown`, `欢迎来到这里`, `/categories/`, and `/tags/`.

- [ ] **Step 2: Add failing generated assertions**

Under `--generated`, require all four article titles and the widget copy `欢迎来到这里`, and assert at least four `<article` occurrences.

- [ ] **Step 3: Run the source verifier and confirm RED**

Run: `npm run verify:site`

Expected: FAIL because `source/_posts/integrated-circuit-notes.md` is missing.

- [ ] **Step 4: Commit the failing contract**

```powershell
git add tests/verify-site.mjs
git commit -m "test rich Stellar homepage"
```

### Task 2: Add native Stellar homepage content

**Files:**
- Modify: `source/_posts/welcome.md`
- Create: `source/_posts/integrated-circuit-notes.md`
- Create: `source/_posts/course-notes-plan.md`
- Create: `source/_posts/project-practice-log.md`
- Modify: `_config.stellar.yml`

**Interfaces:**
- Consumes: Hexo post front matter and Stellar `site_tree.home` widget configuration.
- Produces: four native post cards, a populated left recent list, and a Markdown rightbar card.

- [ ] **Step 1: Enrich the welcome post front matter**

Add a fixed Unsplash `cover`, a Chinese `description`, and preserve the existing title, date, category, tags, and body.

- [ ] **Step 2: Add three starter posts**

Create the three planned files with distinct dates, fixed Unsplash cover URLs, descriptions, categories, tags, and headings. Each body must say it is a content framework or ongoing organization plan and must avoid completed-result claims.

- [ ] **Step 3: Configure native home sidebars**

Add this override to `_config.stellar.yml`:

```yaml
site_tree:
  home:
    leftbar: recent
    rightbar:
      - layout: markdown
        title: 欢迎来到这里
        content: |
          这里是 Jason Xu 的技术学习博客，主要记录数字与混合信号集成电路、课程笔记和项目实践。

          [GitHub](https://github.com/jyxu0621) · [分类](/blog/categories/) · [标签](/blog/tags/)
```

- [ ] **Step 4: Run source verification and confirm GREEN**

Run: `npm run verify:site`

Expected: `Blog verification passed.`

- [ ] **Step 5: Build and verify generated output**

```powershell
npm run clean
npm run build
npm run verify:site -- --generated
```

Expected: four posts generate successfully and verification passes.

- [ ] **Step 6: Commit homepage content**

```powershell
git add source/_posts _config.stellar.yml
git commit -m "build rich Stellar homepage"
```

### Task 3: Visual and production verification

**Files:**
- Verify: `public/index.html`
- Verify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: local server and GitHub Pages deployment.
- Produces: verified desktop/mobile homepage and live production result.

- [ ] **Step 1: Start a local Hexo server on an unused port**

Start the server in the background and verify `http://localhost:4100/blog/` returns HTTP 200.

- [ ] **Step 2: Inspect desktop and mobile layouts**

At desktop width verify four article cards, four cover images, populated recent list, visible right welcome card, correct title/avatar, and no console errors. At 390 by 844 verify no horizontal overflow and readable article cards.

- [ ] **Step 3: Run CI-equivalent verification**

```powershell
npm ci --ignore-scripts
npm run verify:site
npm run clean
npm run build
npm run verify:site -- --generated
git status --short
```

Expected: all commands exit 0 and the worktree is clean after commits.

- [ ] **Step 4: Push and watch deployment**

Push `main`, obtain the new run ID with `gh run list`, and run `gh run watch` with `--exit-status`.

- [ ] **Step 5: Verify production HTML**

Request `https://jyxu0621.github.io/blog/` with cache bypass and require HTTP 200, all four titles, `欢迎来到这里`, at least four article cards, Stellar 1.33.1 CSS, and no root-only `href="/"`.
