# Giscus Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chinese, theme-aware Giscus comment widget to every blog article while storing all comments in GitHub Discussions for `jyxu0621/blog`.

**Architecture:** Keep GitHub Pages and the existing Hexo publishing workflow unchanged. Enable GitHub Discussions and install the Giscus App on the existing public blog repository, then configure Stellar's built-in Giscus adapter with pathname mapping and the concrete repository/category identifiers returned by GitHub.

**Tech Stack:** Hexo 8.1.2, hexo-theme-stellar 1.33.1, Giscus, GitHub Discussions, GitHub CLI, Node.js test runner, GitHub Actions Pages.

## Global Constraints

- The public blog URL remains `https://jyxu0621.github.io/blog/`.
- Use the existing public repository `jyxu0621/blog`; do not create a separate comments repository.
- Use the `Announcements` Discussion category and strict `pathname` mapping.
- Use Chinese UI, reactions, top-positioned input, preferred-color-scheme theme, and lazy loading.
- Do not store a GitHub token, OAuth secret, or any private credential in the repository.
- Install the Giscus App only for `jyxu0621/blog`.
- Do not add a separate server, database, personal domain, or Cloudflare deployment.
- The user must personally approve the Giscus GitHub App installation when GitHub presents the authorization page.
- Creating or deleting a live test comment requires action-time user confirmation.

---

## File Structure

- Modify `tests/verify-site.mjs`: enforce complete Giscus source configuration and generated-page placement.
- Modify `_config.stellar.yml`: enable Stellar's native Giscus service and set all public widget parameters.
- Existing `tools/publish-blog.ps1`: validate, commit, push, wait for GitHub Actions, and check the live site; no code changes planned.
- Existing `.github/workflows/deploy-pages.yml`: continue to build and deploy; no code changes planned.

---

### Task 1: Prepare GitHub Discussions and Giscus App

**Files:**
- No repository file changes.

**Interfaces:**
- Consumes: GitHub repository `jyxu0621/blog`, authenticated GitHub CLI account `jyxu0621`.
- Produces: `giscusRepoId: string = "R_kgDOTWpQAA"` and `giscusCategoryId: string`, where `giscusCategoryId` is the non-empty GraphQL ID of the category whose slug is `announcements`.

- [ ] **Step 1: Verify the precondition**

Run:

```powershell
$gh = 'F:\blog\.local-tools\gh\bin\gh.exe'
& $gh repo view jyxu0621/blog --json nameWithOwner,isPrivate,hasDiscussionsEnabled
```

Expected before mutation:

```json
{"hasDiscussionsEnabled":false,"isPrivate":false,"nameWithOwner":"jyxu0621/blog"}
```

- [ ] **Step 2: Enable GitHub Discussions**

Run:

```powershell
& $gh repo edit jyxu0621/blog --enable-discussions
& $gh repo view jyxu0621/blog --json hasDiscussionsEnabled --jq '.hasDiscussionsEnabled'
```

Expected: `true`.

- [ ] **Step 3: Install the Giscus App for only the blog repository**

Open `https://github.com/apps/giscus/installations/new`, select **Only select repositories**, choose `jyxu0621/blog`, and pause immediately before the final **Install** action. Obtain action-time confirmation from the user, then let the user approve the installation.

Expected: GitHub shows Giscus as installed with access limited to `jyxu0621/blog`.

- [ ] **Step 4: Retrieve and validate repository/category identifiers**

Run:

```powershell
& $gh api graphql `
  -f 'query=query($owner:String!,$name:String!){repository(owner:$owner,name:$name){id hasDiscussionsEnabled discussionCategories(first:20){nodes{id name slug isAnswerable}}}}' `
  -F owner=jyxu0621 `
  -F name=blog
```

Expected:

- `repository.id` equals `R_kgDOTWpQAA`.
- `hasDiscussionsEnabled` equals `true`.
- Exactly one returned category has `slug` equal to `announcements`.
- Store that category's non-empty `id` as `giscusCategoryId` for Task 2.

- [ ] **Step 5: Verify Giscus recognizes the repository**

Open `https://giscus.app/zh-CN`, enter `jyxu0621/blog` in the repository field, and select the `Announcements` category.

Expected: the page reports that the repository meets all three requirements and generates a configuration containing repository ID `R_kgDOTWpQAA` and the same `giscusCategoryId` from Step 4.

---

### Task 2: Configure and Test Stellar's Giscus Adapter

**Files:**
- Modify: `tests/verify-site.mjs`
- Modify: `_config.stellar.yml`

**Interfaces:**
- Consumes: `giscusRepoId = "R_kgDOTWpQAA"` and the concrete `giscusCategoryId` produced by Task 1.
- Produces: a validated `comments.giscus` configuration rendered only on article pages.

- [ ] **Step 1: Add failing source and generated-site assertions**

In `tests/verify-site.mjs`, immediately after `const welcome = ...`, add:

```js
const yamlScalar = (text, key) => {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*['"]?([^'"\\s#]+)`, "m"));
  assert.ok(match, `Missing non-empty YAML setting: ${key}`);
  return match[1];
};

for (const expected of [
  "service: giscus",
  "lazyload: true",
  "src: https://giscus.app/client.js",
  "data-repo: jyxu0621/blog",
  "data-repo-id: R_kgDOTWpQAA",
  "data-category: Announcements",
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

const giscusCategoryId = yamlScalar(stellar, "data-category-id");
assert.ok(giscusCategoryId.startsWith("DIC_"), "Giscus category ID is invalid");
```

Inside the existing `if (process.argv.includes("--generated"))` block, after reading `public/index.html`, add:

```js
const generatedPost = read("public/2026/07/13/welcome/index.html");
assert.ok(generatedPost.includes('id="giscus"'), "Generated post is missing Giscus container");
for (const expected of [
  'src="https://giscus.app/client.js"',
  'data-repo="jyxu0621/blog"',
  'data-repo-id="R_kgDOTWpQAA"',
  'data-category="Announcements"',
  `data-category-id="${giscusCategoryId}"`,
  'data-mapping="pathname"',
  'data-strict="1"',
  'data-lang="zh-CN"',
]) {
  assert.ok(generatedPost.includes(expected), `Generated Giscus widget is missing: ${expected}`);
}
assert.ok(!generated.includes('id="giscus"'), "Homepage must not contain a Giscus widget");
```

- [ ] **Step 2: Run the source test and verify RED**

Run:

```powershell
npm run verify:site
```

Expected: FAIL with `Missing Giscus setting: service: giscus`.

- [ ] **Step 3: Add the minimal Stellar configuration**

Append this block to `_config.stellar.yml`, replacing the value expression `giscusCategoryId` with the exact `DIC_...` string produced by Task 1:

```yaml
comments:
  service: giscus
  comment_title: 快来参与讨论吧~
  lazyload: true
  giscus:
    src: https://giscus.app/client.js
    data-repo: jyxu0621/blog
    data-repo-id: R_kgDOTWpQAA
    data-category: Announcements
    data-category-id: giscusCategoryId
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

The committed YAML must contain the concrete category ID and must not contain the literal text `giscusCategoryId`.

- [ ] **Step 4: Run the source test and verify GREEN**

Run:

```powershell
npm run verify:site
```

Expected: `Blog verification passed.`

- [ ] **Step 5: Build and verify generated placement**

Run:

```powershell
npm run clean
npm run build
npm run verify:site -- --generated
```

Expected:

- Hexo reports a successful Stellar build.
- Generated verification prints `Blog verification passed.`
- `public/2026/07/13/welcome/index.html` contains the Giscus widget parameters.
- `public/index.html` contains no Giscus widget.

- [ ] **Step 6: Run the complete local regression suite**

Run:

```powershell
npm run test:local-cover
npm run verify:site
& 'F:\blog\.local-tools\mingit\cmd\git.exe' diff --check
```

Expected: 4 local-cover tests pass, site verification passes, and `git diff --check` reports no errors.

- [ ] **Step 7: Commit the tested configuration**

Run:

```powershell
$git = 'F:\blog\.local-tools\mingit\cmd\git.exe'
& $git add -- _config.stellar.yml tests/verify-site.mjs
& $git commit -m "feat: add Giscus comments"
```

Expected: one commit containing only the Stellar configuration and its regression tests.

---

### Task 3: Publish and Verify the Live Comment Widget

**Files:**
- No planned source changes; use the committed implementation and existing deployment tools.

**Interfaces:**
- Consumes: the Task 2 commit, configured GitHub Discussions, and installed Giscus App.
- Produces: a live Giscus widget on `https://jyxu0621.github.io/blog/` article pages.

- [ ] **Step 1: Run the one-click publisher in validation-only mode**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File F:\blog-site\tools\publish-blog.ps1 -DryRun
```

Expected: `DRY RUN: validation completed; no files were staged, committed, or pushed.`

- [ ] **Step 2: Publish the exact local commits**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File F:\blog-site\tools\publish-blog.ps1
```

Expected:

- Local commits are pushed normally or through the existing exact-commit GitHub API fallback.
- The `Deploy GitHub Pages` Actions run completes successfully.
- The publisher reports HTTP 200 for `https://jyxu0621.github.io/blog/`.

- [ ] **Step 3: Verify repository and deployment state**

Run:

```powershell
$git = 'F:\blog\.local-tools\mingit\cmd\git.exe'
$gh = 'F:\blog\.local-tools\gh\bin\gh.exe'
$local = (& $git rev-parse HEAD).Trim()
$remote = (& $gh api repos/jyxu0621/blog/git/ref/heads/main --jq '.object.sha').Trim()
if ($local -ne $remote) { throw "Local and remote SHAs differ" }
if (& $git status --porcelain) { throw "Worktree is not clean" }
```

Expected: no output and exit code 0.

- [ ] **Step 4: Verify the live widget without posting**

Open the welcome article at `https://jyxu0621.github.io/blog/2026/07/13/welcome/` in desktop and mobile widths.

Expected:

- The Chinese Giscus interface loads below the article.
- The iframe follows the current light/dark preference.
- The login prompt is visible for a signed-out visitor.
- Home, archive, category, and tag pages do not show comment widgets.

- [ ] **Step 5: Optionally verify end-to-end comment creation**

Pause and obtain action-time user confirmation before posting. After confirmation, post a temporary comment containing `Giscus deployment verification`, verify that a Discussion is created in `Announcements`, and confirm the comment appears on the article.

Pause again and obtain action-time user confirmation before deletion. After confirmation, delete the temporary comment through GitHub moderation while leaving the generated Discussion intact unless the user explicitly requests that the Discussion itself also be deleted.

- [ ] **Step 6: Report final evidence**

Report:

- Git commit SHA.
- GitHub Actions run URL and conclusion.
- Live article URL.
- Confirmation that Giscus loads in Chinese and that no credential was committed.
- Whether the optional live comment test was performed or skipped.

