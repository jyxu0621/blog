# Hexo Butterfly Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a Simplified Chinese Hexo blog named `Jason Xu's Blog` at `https://jyxu0621.github.io/blog/` using the Butterfly theme.

**Architecture:** Keep the blog source in the independent public repository `jyxu0621/blog`. GitHub Actions installs locked npm dependencies, generates Hexo static output, verifies `public/index.html`, and deploys the artifact to GitHub Pages.

**Tech Stack:** Node.js 24, npm, Hexo, hexo-theme-butterfly, GitHub Actions, GitHub Pages.

## Global Constraints

- Site title is exactly `Jason Xu's Blog`; author is exactly `Jason Xu`.
- Interface language is Simplified Chinese.
- Public URL is `https://jyxu0621.github.io/blog/`; Hexo root is `/blog/`.
- Do not add comments, analytics, external search, a custom domain, or Cloudflare.
- Keep the personal homepage repository independent.

---

### Task 1: Scaffold and verify the blog source

**Files:**
- Create: Hexo scaffold under repository root
- Create: `scripts/verify-site.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run verify:site`, which validates source configuration before generation and validates `public/index.html` after generation.

- [ ] **Step 1: Write the failing verification script**

Create `scripts/verify-site.mjs` to assert `_config.yml` contains the exact title, author, language `zh-CN`, URL, and root; assert `package.json` includes `hexo-theme-butterfly`; and require `public/index.html` only when invoked with `--generated`.

- [ ] **Step 2: Verify RED**

Run: `node scripts/verify-site.mjs`
Expected: FAIL because the Hexo source configuration is not yet present.

- [ ] **Step 3: Initialize Hexo and install Butterfly**

Run `npx hexo init`, install dependencies, then install `hexo-theme-butterfly` and save the resulting npm lockfile. Add `verify:site` and `build` scripts to `package.json`.

- [ ] **Step 4: Verify GREEN**

Run: `npm run verify:site`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `scaffold Hexo Butterfly blog`.

### Task 2: Configure Chinese Butterfly content and project paths

**Files:**
- Modify: `_config.yml`
- Create: `_config.butterfly.yml`
- Modify: `source/_posts/hello-world.md`

**Interfaces:**
- Produces: generated routes and assets rooted at `/blog/`.

- [ ] **Step 1: Extend the verification script**

Assert the Butterfly config enables `theme: butterfly`, contains a home navigation item, and contains a personal-homepage link to `https://jyxu0621.github.io/`. Assert the welcome post contains the Chinese title `欢迎来到 Jason Xu's Blog`.

- [ ] **Step 2: Verify RED**

Run: `npm run verify:site`
Expected: FAIL because Butterfly and welcome content are not configured.

- [ ] **Step 3: Implement minimal configuration**

Set `title`, `author`, `language`, `url`, `root`, `theme`, timezone, permalink, and zero sample metadata. Copy Butterfly's default config to `_config.butterfly.yml`, then minimally set Chinese menu entries and the personal-homepage link. Replace the sample post with a Chinese welcome post about technical learning and project notes.

- [ ] **Step 4: Generate and validate**

Run: `npm run clean && npm run build && npm run verify:site -- --generated`
Expected: PASS and `public/index.html` contains the site title and `/blog/` asset paths.

- [ ] **Step 5: Commit**

Commit message: `configure Chinese Butterfly blog`.

### Task 3: Deploy through GitHub Pages

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: locked npm dependencies and generated `public/` output.
- Produces: public Pages deployment at `https://jyxu0621.github.io/blog/`.

- [ ] **Step 1: Add workflow assertions**

Extend `scripts/verify-site.mjs` to require the workflow and its `npm ci`, source verification, Hexo build, generated verification, Pages artifact upload, and deployment steps.

- [ ] **Step 2: Verify RED**

Run: `npm run verify:site`
Expected: FAIL because the workflow is missing.

- [ ] **Step 3: Add the official Pages workflow**

Use `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, and `actions/deploy-pages@v4`. Build with Node 24 and upload `public`.

- [ ] **Step 4: Run final local verification**

Run: `npm ci --ignore-scripts`, `npm run verify:site`, `npm run clean`, `npm run build`, and `npm run verify:site -- --generated`.
Expected: all exit 0.

- [ ] **Step 5: Publish and verify**

Create public repository `jyxu0621/blog`, push `main`, wait for the Pages workflow, verify Pages status is `built`, and confirm the remote config contains `/blog/` paths.

- [ ] **Step 6: Commit**

Commit message: `deploy blog with GitHub Pages`.
