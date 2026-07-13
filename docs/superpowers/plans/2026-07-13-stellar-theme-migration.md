# Stellar Theme Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Butterfly with Stellar on Jason Xu's existing Hexo blog without changing its content, public URL, or GitHub Pages deployment.

**Architecture:** Keep Hexo and all content as the stable site layer, replace only the npm theme dependency and root theme override file, and extend the existing verifier to enforce the migration contract. GitHub Actions continues to build and deploy `public` from `main`.

**Tech Stack:** Hexo 8.1.2, hexo-theme-stellar 1.33.1, Node.js 24, GitHub Actions, GitHub Pages

## Global Constraints

- Public URL remains `https://jyxu0621.github.io/blog/` with `root: /blog/`.
- Site title remains `Jason Xu's Blog`, author remains `Jason Xu`, and language remains `zh-CN`.
- Existing posts, categories, tags, archives, and permalink rules remain unchanged.
- Use Stellar's native layout; do not recreate Butterfly templates or add comments, analytics, or a custom domain.
- Keep the existing GitHub Pages workflow and `public` artifact contract.

---

### Task 1: Encode the Stellar migration contract

**Files:**
- Modify: `tests/verify-site.mjs`

**Interfaces:**
- Consumes: root Hexo configuration, `package.json`, theme override files, generated `public/index.html`.
- Produces: `npm run verify:site` and `npm run verify:site -- --generated` assertions for Stellar.

- [ ] **Step 1: Write the failing source assertions**

Replace Butterfly-specific assertions with checks equivalent to:

```js
assert.ok(packageJson.dependencies?.["hexo-theme-stellar"], "hexo-theme-stellar dependency is missing");
assert.ok(!packageJson.dependencies?.["hexo-theme-butterfly"], "Butterfly dependency must be removed");
assert.ok(config.includes("theme: stellar"), "Stellar is not active");
assert.ok(existsSync(new URL("_config.stellar.yml", root)), "Stellar config is missing");
assert.ok(!existsSync(new URL("_config.butterfly.yml", root)), "Butterfly config must be removed");
```

Assert the Stellar override contains `Jason Xu`, `https://github.com/jyxu0621.png`, `/archives/`, `/tags/`, `/categories/`, and `https://jyxu0621.github.io/`.

- [ ] **Step 2: Write the generated-site assertion**

Inside the `--generated` branch, require a Stellar asset marker:

```js
assert.ok(generated.includes("/blog/css/main.css"), "Generated Stellar stylesheet is missing");
```

- [ ] **Step 3: Run the verifier and confirm RED**

Run: `npm run verify:site`

Expected: FAIL with `hexo-theme-stellar dependency is missing` while Butterfly is still installed.

- [ ] **Step 4: Commit the contract**

```powershell
git add tests/verify-site.mjs
git commit -m "test Stellar theme migration"
```

### Task 2: Replace Butterfly with Stellar

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `_config.yml`
- Create: `_config.stellar.yml`
- Delete: `_config.butterfly.yml`

**Interfaces:**
- Consumes: Hexo theme resolution and npm package installation.
- Produces: a Stellar-rendered static blog rooted at `/blog/`.

- [ ] **Step 1: Replace the npm theme dependency**

Run:

```powershell
npm uninstall hexo-theme-butterfly
npm install --save-exact hexo-theme-stellar@1.33.1
```

Expected: `package.json` contains `"hexo-theme-stellar": "1.33.1"` and no Butterfly dependency.

- [ ] **Step 2: Activate Stellar**

Change the theme line in `_config.yml` to:

```yaml
theme: stellar
```

- [ ] **Step 3: Add minimal Stellar overrides**

Create `_config.stellar.yml` with these overrides:

```yaml
logo:
  avatar: '[https://github.com/jyxu0621.png](/)'
  title: "[Jason Xu's Blog](/)"
  subtitle: 记录技术学习与项目实践

menubar:
  columns: 5
  items:
    - id: home
      icon: solar:home-smile-bold-duotone
      title: 首页
      url: /
    - id: archives
      icon: solar:archive-bold-duotone
      title: 归档
      url: /archives/
    - id: tags
      icon: solar:hashtag-square-bold
      title: 标签
      url: /tags/
    - id: categories
      icon: solar:folder-with-files-bold-duotone
      title: 分类
      url: /categories/
    - id: profile
      icon: solar:user-bold-duotone
      title: 个人主页
      url: https://jyxu0621.github.io/
```

- [ ] **Step 4: Remove obsolete Butterfly configuration**

Delete `_config.butterfly.yml`.

- [ ] **Step 5: Run source verification and confirm GREEN**

Run: `npm run verify:site`

Expected: `Blog verification passed.`

- [ ] **Step 6: Build and verify generated output**

Run:

```powershell
npm run clean
npm run build
npm run verify:site -- --generated
```

Expected: Hexo exits 0, generates `public/index.html`, and prints `Blog verification passed.`

- [ ] **Step 7: Commit the theme migration**

```powershell
git add package.json package-lock.json _config.yml _config.stellar.yml _config.butterfly.yml
git commit -m "switch blog theme to Stellar"
```

### Task 3: Visual and deployment verification

**Files:**
- Verify: `public/`
- Verify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: local Hexo server and GitHub Pages workflow.
- Produces: confirmed desktop/mobile local rendering and a live Stellar site.

- [ ] **Step 1: Start the local server**

Run: `npm run dev -- -p 4000`

Expected: Hexo serves `http://localhost:4000/blog/`.

- [ ] **Step 2: Inspect desktop and mobile rendering**

In the browser, verify the title, Chinese navigation, welcome post, avatar, `/blog/` internal links, and personal-home external link. Check a desktop viewport and a mobile viewport, then confirm no console errors.

- [ ] **Step 3: Run the full CI-equivalent verification**

Run:

```powershell
npm ci --ignore-scripts
npm run verify:site
npm run clean
npm run build
npm run verify:site -- --generated
git status --short
```

Expected: every command exits 0 and the worktree is clean after committed changes.

- [ ] **Step 4: Push and watch deployment**

```powershell
git push origin main
$runId = gh run list --repo jyxu0621/blog --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $runId --repo jyxu0621/blog --exit-status
```

Expected: build and deploy jobs both complete successfully.

- [ ] **Step 5: Verify the live site**

Request `https://jyxu0621.github.io/blog/` and require HTTP 200, `Jason Xu's Blog`, Chinese welcome content, and a Stellar stylesheet reference. Confirm the Pages API reports `build_type: workflow` and HTTPS enforcement.
