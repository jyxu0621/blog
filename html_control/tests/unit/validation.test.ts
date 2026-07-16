import { describe, expect, it } from "vitest";
import { collectLocalResourcePaths, validateProjectConfig } from "../../src/shared/validation/project-validation";

describe("project configuration validation", () => {
  it("reports a sidebar widget reference that does not exist", () => {
    const result = validateProjectConfig(
      { root: "/blog/" },
      { site_tree: { post: { leftbar: ["recent", "missing"] } } },
      { recent: { layout: "recent" } },
      true,
    );

    expect(result.issues.some((issue) => issue.message.includes("missing"))).toBe(true);
  });

  it("reports generated navigation links duplicated in nav_tabs", () => {
    const result = validateProjectConfig(
      { root: "/blog/" },
      { site_tree: { index_blog: { nav_tabs: { 分类: "/categories/" } } } },
      {},
      false,
    );

    expect(result.issues.some((issue) => issue.message.includes("自动导航"))).toBe(true);
  });

  it("reports duplicate server and browser formula renderers", () => {
    const result = validateProjectConfig(
      { root: "/blog/" },
      { plugins: { mathjax: { enable: true } } },
      {},
      true,
    );

    expect(result.issues.some((issue) => issue.message.includes("公式渲染"))).toBe(true);
  });

  it("requires configured ids when giscus is selected", () => {
    const result = validateProjectConfig(
      { root: "/blog/" },
      { comments: { service: "giscus", giscus: { "data-repo": "owner/repo" } } },
      {},
      false,
    );

    expect(result.issues.some((issue) => issue.message.includes("data-repo-id"))).toBe(true);
  });

  it("collects local image resources and rejects traversal-like paths", () => {
    expect(collectLocalResourcePaths({ logo: { avatar: "/blog/assets/avatar.png" }, remote: "https://example.com/a.png" }, "/blog/"))
      .toEqual([{ yamlPath: ["logo", "avatar"], relativePath: "assets/avatar.png" }]);
    expect(() => collectLocalResourcePaths({ cover: "/blog/../secret.png" }, "/blog/")).toThrow("越界");
  });
});
