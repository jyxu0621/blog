# Xaoxuu-style Menubar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current five-item Stellar menubar with the same four-card icon, label, order, and color treatment currently used on xaoxuu.com.

**Architecture:** Keep Stellar's native menubar renderer. Add project-level icon data in `source/_data/icons.yml` for xaoxuu.com's four current inline SVGs, then reference those keys and colors from `_config.stellar.yml`; Hexo continues to apply the `/blog/` site root.

**Tech Stack:** Hexo 8.1.2, hexo-theme-stellar 1.33.1, YAML, Node.js verification script, GitHub Actions Pages.

## Global Constraints

- Use four equal-width cards in the order `博客`, `项目`, `探索`, `社交`.
- Use xaoxuu.com's current blue `#1BCDFC`, green `#3DC550`, orange `#FA6400`, and red `#F44336` accents.
- Use Stellar-native rendering without custom menu HTML or CSS.
- Preserve the Chinese interface, `Jason Xu's Blog`, `/blog/` root, posts, sidebars, and workflow.
- Internal generated links must remain under `/blog/`; no unresolved `solar:` text may be visible.

---

### Task 1: Define the four-card contract as a failing regression test

**Files:**
- Modify: `tests/verify-site.mjs`

**Interfaces:**
- Consumes: `_config.stellar.yml` and generated `public/index.html`.
- Produces: assertions for four labels, colors, destinations, menu cards, and inline SVGs.

- [ ] **Step 1: Add source assertions**

Assert that the Stellar configuration includes `columns: 4`, all four approved labels/colors/URLs, and does not include the old five-item labels.

- [ ] **Step 2: Add generated HTML assertions**

Extract `<nav class="menu dis-select">...</nav>` and assert four `nav-item` elements, four `<svg>` elements, each approved title/color, and zero `>solar:` strings.

- [ ] **Step 3: Run the generated verification and observe failure**

Run: `npm run verify:site -- --generated`

Expected: FAIL because the current output has five menu items and lacks the approved four-card labels/colors.

- [ ] **Step 4: Commit the regression test**

```powershell
git add tests/verify-site.mjs
git commit -m "test xaoxuu-style Stellar menubar"
```

### Task 2: Configure the xaoxuu-style native Stellar menu

**Files:**
- Create: `source/_data/icons.yml`
- Modify: `_config.stellar.yml`

**Interfaces:**
- Consumes: Stellar's project data merge for `data.icons`.
- Produces: four icon keys that resolve to inline SVG and four native menubar entries.

- [ ] **Step 1: Capture the exact reference icons**

Read the four SVG elements from the current `https://xaoxuu.com/` menubar and store them as single-line YAML values under stable project keys `jason:blog`, `jason:projects`, `jason:explore`, and `jason:social` in `source/_data/icons.yml`.

- [ ] **Step 2: Replace the Stellar menu configuration**

Set `columns: 4` and configure:

```yaml
- id: home
  icon: jason:blog
  title: 博客
  url: /
  color: '#1BCDFC'
- id: projects
  icon: jason:projects
  title: 项目
  url: /categories/项目实践/
  color: '#3DC550'
- id: explore
  icon: jason:explore
  title: 探索
  url: /archives/
  color: '#FA6400'
- id: social
  icon: jason:social
  title: 社交
  url: https://github.com/jyxu0621
  color: '#F44336'
```

- [ ] **Step 3: Build and pass verification**

Run: `npm run clean; npm run build; npm run verify:site -- --generated`

Expected: PASS, with four cards, four SVG icons, approved colors, and no unresolved icon keys.

- [ ] **Step 4: Commit implementation**

```powershell
git add source/_data/icons.yml _config.stellar.yml
git commit -m "build xaoxuu-style Stellar menubar"
```

### Task 3: Validate and deploy

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: committed Hexo source and GitHub Pages workflow.
- Produces: verified live four-card menubar.

- [ ] **Step 1: Run the complete local verification sequence**

Run: `npm ci --ignore-scripts; npm run verify:site; npm run clean; npm run build; npm run verify:site -- --generated`

Expected: all commands exit 0.

- [ ] **Step 2: Check responsive output**

Serve the generated site and inspect desktop plus 390x844 mobile layouts. Confirm four cards, correct colors/icons, no raw icon keys, and no horizontal overflow.

- [ ] **Step 3: Push the commits**

Run: `git push origin main`

- [ ] **Step 4: Verify GitHub Pages**

Wait for the matching GitHub Actions run to succeed, then fetch `https://jyxu0621.github.io/blog/` without cache and confirm HTTP 200, four menu cards, four SVGs, approved colors, and zero unresolved icon keys.
