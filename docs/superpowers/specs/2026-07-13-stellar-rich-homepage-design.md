# Stellar Rich Homepage Design

## Goal

Make `https://jyxu0621.github.io/blog/` resemble the content-rich standard blog homepage at `https://xaoxuu.com/` while continuing to use Stellar's native components and without inventing personal achievements.

## Homepage structure

The root `/blog/` remains Stellar's normal blog index rather than becoming a wiki page. The desktop layout uses Stellar's native three-column structure:

- Left: Jason Xu avatar, title and subtitle, five navigation entries, and recent updates.
- Center: four article cards with covers, excerpts, dates, categories, and tags.
- Right: a Markdown welcome card plus direct links to GitHub, categories, and tags.

On mobile, Stellar's responsive behavior collapses the sidebars and keeps the article list readable without horizontal scrolling.

## Starter content

The homepage contains these four articles:

1. `欢迎来到 Jason Xu's Blog`
2. `数字与混合信号集成电路学习笔记`
3. `课程笔记整理计划`
4. `项目实践记录`

The existing welcome post is retained and enhanced with an excerpt and cover. The other three are clearly written as content frameworks or plans. They may contain suggested section headings and prompts, but must not claim that Jason completed specific projects, experiments, courses, or results.

Each article uses a stable public cover URL, Chinese category and tag metadata, and a short excerpt so Stellar can render visually complete cards. No local image generation or custom artwork is included.

## Theme configuration

`_config.stellar.yml` will use only Stellar-supported settings. The home layout keeps `recent` on the left and adds a configured Markdown welcome widget on the right. The welcome widget identifies the site as Jason Xu's technical learning blog and provides links to GitHub, categories, and tags. Comments, analytics, external search, custom domains, and custom HTML/CSS remain disabled or absent.

All internal links must resolve below `/blog/`; the personal homepage remains the only navigation link intentionally pointing to `https://jyxu0621.github.io/`.

## Verification

The source verifier will require all four posts, front-matter cover/excerpt/category/tag metadata, and the right-side welcome widget configuration. This test will be written and observed failing before content and configuration are added.

Generated-site verification will require four article cards, the welcome widget copy, Stellar 1.33.1 assets, and no `href="/"` links. Browser checks will compare desktop and 390-pixel mobile layouts, verify the covers load, confirm the right-side card is visible on desktop, and check for horizontal overflow and console errors.

After local verification, the change will be committed and pushed to `main`. Completion requires a successful GitHub Pages workflow and a live HTTPS 200 page containing the four cards and welcome widget.

## Rollback

The richer homepage changes are isolated in implementation commits after this design. Reverting those commits restores the current one-post Stellar homepage without affecting the earlier Butterfly-to-Stellar migration.
