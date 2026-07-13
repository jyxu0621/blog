# Stellar Theme Migration Design

## Goal

Replace the current Butterfly presentation layer with the official Stellar Hexo theme while preserving the existing blog identity, content, GitHub Pages URL, and automated deployment.

## User-facing result

- The public URL remains `https://jyxu0621.github.io/blog/`.
- The site name remains `Jason Xu's Blog` and the interface remains Chinese.
- Existing posts, categories, tags, archives, and dated permalinks remain available.
- The site uses Stellar's native visual style without recreating Butterfly's layout.
- The navigation provides home, archives, tags, categories, and a link back to `https://jyxu0621.github.io/`.
- The GitHub avatar remains the site avatar.

## Implementation boundary

The migration changes only the theme dependency and theme configuration. It does not redesign templates, add comments or analytics, change article content, introduce a custom domain, or change the GitHub Actions deployment model.

The project will install the current npm release of `hexo-theme-stellar`, switch the Hexo `theme` setting to `stellar`, and add a root-level `_config.stellar.yml` containing only the site-specific overrides needed for this blog. The obsolete Butterfly dependency and `_config.butterfly.yml` will be removed so that only one active theme configuration remains.

## Compatibility and paths

Hexo retains `url: https://jyxu0621.github.io/blog/` and `root: /blog/`. Internal navigation will use root-aware relative paths so generated assets and links resolve under `/blog/`. Existing GitHub Pages Actions continue to build the `public` directory and deploy it unchanged.

## Verification

The existing site verifier will be updated before the theme change so it initially fails when it cannot find Stellar. It will then validate the Stellar dependency and configuration, confirm Butterfly is absent, build the generated site, and check that the generated HTML contains the title, Chinese content, `/blog/` links, and Stellar assets.

After automated checks pass, the site will be inspected locally in desktop and mobile viewports for navigation, article rendering, avatar loading, and console errors. The change will then be committed and pushed to `main`; completion requires a successful GitHub Actions deployment and an HTTPS 200 response from the live blog containing Stellar output.

## Rollback

The migration is contained in one implementation commit. If the deployed theme has an unexpected compatibility problem, reverting that commit restores the prior Butterfly dependency and configuration.
