# Xaoxuu-style Menubar Design

## Goal

Make the upper-left Stellar menubar on Jason Xu's Blog match the current visual structure of `https://xaoxuu.com/`, while retaining Jason Xu's own content and GitHub Pages subpath.

## Confirmed Design

- Use four equal-width menu cards instead of the current five-card navigation.
- Match xaoxuu.com's current order, labels, Solar icons, and accent colors through Stellar's native `theme` field:
  - blue `博客`
  - green `项目`
  - orange `探索`
  - red `社交`
- Keep Stellar's native menu rendering and styling. Do not add custom menu HTML or CSS.
- Preserve the site's Chinese interface and English site title `Jason Xu's Blog`.

## Link Mapping

- `博客` -> `/blog/`
- `项目` -> `/blog/categories/项目实践/`
- `探索` -> `/blog/archives/`
- `社交` -> `https://github.com/jyxu0621`

Hexo source configuration may use root-relative values such as `/` and `/archives/` where Stellar automatically applies the configured `/blog/` root. Generated internal links must remain under `/blog/`.

## Icon Handling

Use the exact four SVG icon definitions currently rendered by xaoxuu.com. Store any icons not bundled with Stellar 1.33.1 in the project-level Stellar icon data override, so every configured icon key resolves to inline SVG during generation. Raw strings such as `solar:...` must never appear as visible menu text.

## Verification

- Source verification confirms exactly four menu entries with the approved labels, colors, and destinations.
- Generated HTML contains exactly four menubar items and four inline SVG icons.
- Generated HTML contains no unresolved `>solar:` icon keys.
- Internal links retain the `/blog/` prefix.
- Existing blog cards, sidebars, posts, title, and GitHub Pages workflow remain unchanged.
- Desktop and mobile layouts remain free of horizontal overflow.

## Scope

This change only replaces the upper-left menubar. It does not create empty project, notes, or friends pages and does not copy xaoxuu.com's personal content, branding, or articles.
