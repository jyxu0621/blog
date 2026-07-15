# Stellar Blog Optimization Design

## Goal

Turn `https://jyxu0621.github.io/blog/` into a polished, low-maintenance technical blog where Jason can publish from HexoHub without revisiting theme configuration. Preserve the existing Stellar visual identity and Giscus deployment while improving navigation, sidebars, typography, authoring defaults, search, SEO, feeds, images, code blocks, and engineering-formula support.

## Design Principles

- Follow Stellar 1.33.1's native configuration, widget, and plugin interfaces instead of forking the theme or adding custom layout code.
- Match xaoxuu.com's typography exactly while retaining robust system-font fallbacks.
- Prefer maintained, deterministic plugins that add value to an electronics/engineering blog.
- Keep public pages fast: do not load unused carousel, AI, social-feed, diagram, or typography-enhancement scripts.
- Keep `/blog/` as the canonical root and preserve all existing article URLs.
- Store no token, key, account credential, or private API endpoint in the repository.

## Current State Preserved

- Hexo 8.1.2 and Stellar 1.33.1.
- GitHub Pages deployment from `jyxu0621/blog`.
- Four-button menubar, gradient/sidebar background, existing posts, categories, tags, images, local-cover validation, and one-click publisher.
- Giscus comments in Chinese using `Announcements` and strict pathname mapping.

## Typography

Use the same public font stylesheet and font stacks currently used by xaoxuu.com:

- Stylesheet: `https://npm.elemecdn.com/lxgw-wenkai-screen-webfont/style.css`
- Body: `"LXGW WenKai Screen", system-ui, "Microsoft Yahei", "Helvetica Neue", Helvetica, Arial, sans-serif`
- Inline code and code blocks: `"LXGW WenKai Screen", Menlo, Monaco, Consolas, system-ui, "Courier New", monospace, sans-serif`

Load the stylesheet with xaoxuu.com's non-blocking `media="print"` plus `onload` pattern and a `noscript` fallback. Add a preconnect for the font host. If the CDN is unavailable, the page remains readable through the declared system fonts.

## Sidebar and Navigation

Create `source/_data/widgets.yml` with four reusable widgets:

1. `recent`: five recent posts and an Atom feed link.
2. `quick_links`: a two-column link list for the personal homepage, GitHub, categories, and tags.
3. `tagcloud`: a compact tag cloud with counts disabled and conservative font sizing.
4. `toc`: an H2-H4 article table of contents with `recent` fallback.

Configure `site_tree` by page type:

- Home and blog indexes: `recent, quick_links` on the left and `tagcloud` on the right.
- Article pages: `recent, quick_links` on the left and `toc, tagcloud` on the right.
- Generic pages: `recent, quick_links` on the left and `toc` on the right.
- Error pages: `recent` on the left.

Keep the current four menubar buttons. Explicitly configure the blog index tabs for recent posts, categories, tags, and archives. Add a footer sitemap for the same destinations plus the personal homepage and GitHub.

## Search, Metadata, and Sharing

- Make Stellar's built-in local search explicit: index posts and pages, include content and code blocks, and use `/search.json`.
- Enable canonical metadata with `jyxu0621.github.io` as the original host and `localhost` as the only development host.
- Keep Open Graph enabled and add structured-data links for Jason's GitHub account, personal homepage, and blog.
- Keep technical article layout, explicit CC BY-NC-SA 4.0 licensing, and enable the copy-link share action.
- Add an Atom feed at `/blog/atom.xml` using the maintained official `hexo-generator-feed` package.

## Selective Plugins

### Enable

- `hexo-generator-feed@^4.0.0`: maintained official Hexo feed generator.
- `hexo-filter-mathjax@^0.11.0`: maintained server-side MathJax rendering, enabled only when an article has `mathjax: true`.
- Stellar preload/flying-pages: retain for navigation responsiveness.
- Stellar Fancybox: apply to ordinary Markdown images and Stellar image tags.
- Stellar copy-code: use Chinese labels and toast text.

### Disable or Exclude

- Theme-side MathJax and KaTeX: disabled to avoid duplicate client-side renderers; formulas use the server-side filter only.
- Mermaid: not installed because the Hexo filters referenced by the Stellar documentation are stale and unnecessary until a real diagram article needs them.
- Memos: requires an external account/service and adds a second publishing system.
- Tianli GPT: requires an external key/service and sends article content to a third party.
- Swiper: disabled until a post actually uses a carousel.
- ScrollReveal: disabled because Stellar warns that it can produce blank pages.
- Heti: disabled because Stellar documents code-block conflicts.
- Related-post plugin: omitted because it is comparatively stale and the current corpus is too small to justify it.

## Authoring Workflow

Extend `scaffolds/post.md` with `mathjax: false` while retaining title, date, tags, categories, description, and cover. HexoHub continues to create normal posts and local asset folders. For formula-heavy posts, Jason changes only `mathjax: false` to `mathjax: true`; no theme edit is required.

No existing article is rewritten merely to demonstrate a plugin. A non-published draft fixture will provide a formula smoke test without adding a public article.

## Files and Interfaces

- `_config.stellar.yml`: typography, inject, widgets placement, navigation, search, metadata, article settings, footer, and plugin switches.
- `_config.yml`: feed and server-side MathJax configuration.
- `source/_data/widgets.yml`: reusable sidebar component library.
- `scaffolds/post.md`: future-post defaults.
- `source/_drafts/mathjax-verification.md`: unpublished formula fixture.
- `package.json` and `package-lock.json`: pinned dependency graph and verification command.
- `tests/verify-site.mjs`: source and generated-site assertions.
- `.github/workflows/deploy-pages.yml`: run the added advanced-site verification before deployment if a distinct command is introduced.

## Verification

- Source checks lock the exact font URL and stacks, widget definitions, page placements, search/SEO/feed settings, plugin allowlist/denylist, and scaffold defaults.
- A draft build proves the MathJax fixture renders server-side without adding front-end MathJax scripts.
- A normal production build proves the draft is absent, Atom feed exists, font link and sidebar widgets render, article pages retain Giscus, and unused plugin scripts are absent.
- Existing local-cover and Giscus regression tests remain green.
- Desktop and mobile screenshots verify the font, sidebars, content width, navigation, formula output, and comments without overflow.
- Deployment verification requires local/remote SHA equality, a successful Pages workflow, HTTP 200 for representative pages and the feed, and no missing static assets.

## Rollback

All changes are configuration, data, scaffolding, tests, and dependencies. Reverting the optimization commits restores the current live layout without touching Discussions, Giscus data, existing posts, or GitHub Pages settings.

