# Hexo Butterfly Blog Design

## Goal

Deploy an independently maintained personal blog at `https://jyxu0621.github.io/blog/` while keeping the existing personal homepage repository separate.

## Architecture

- Repository: public `jyxu0621/blog`.
- Generator and theme: Hexo with the npm-distributed Butterfly theme.
- Source branch: `main`, containing configuration and Markdown posts.
- Hosting: GitHub Pages built and deployed by an official GitHub Actions workflow.
- Site URL: `https://jyxu0621.github.io/blog/`; Hexo root path: `/blog/`.

## Initial Content and Configuration

- Site title: `Jason Xu's Blog`.
- Author: `Jason Xu`.
- Interface language: Simplified Chinese.
- First post: a short Chinese welcome post explaining that the blog will record technical learning and projects.
- Keep the first release minimal: no comments, analytics, external search service, custom domain, or Cloudflare integration.
- Preserve Butterfly defaults unless a change is required for Chinese localization or the `/blog/` project path.

## Deployment and Failure Handling

- Every push to `main` runs dependency installation, Hexo generation, output verification, and GitHub Pages deployment.
- The workflow must fail if generation fails or `public/index.html` is missing.
- Static asset and internal links must resolve under `/blog/`, not the domain root.

## Acceptance Criteria

- The public repository exists at `https://github.com/jyxu0621/blog`.
- GitHub Actions completes successfully and Pages reports `built`.
- `https://jyxu0621.github.io/blog/` renders the Butterfly homepage in Simplified Chinese.
- The site displays `Jason Xu's Blog`, `Jason Xu`, and the Chinese welcome post.
- Archive, tag, category, pagination, theme assets, and the link back to the personal homepage use valid `/blog/`-aware URLs.
