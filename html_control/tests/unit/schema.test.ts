import { describe, expect, it } from "vitest";
import { buildSchema, searchSchema } from "../../src/shared/schema/stellar-schema";

const stellar = {
  canonical: { originalHost: "example.com", officialHosts: ["localhost"] },
  menubar: { columns: 4, items: [{ id: "home", title: "博客" }] },
  plugins: { mermaid: { enable: false } },
  style: { prefers_theme: "auto", color: { theme: "#123456" } },
};

describe("Stellar schema", () => {
  it("creates searchable fields for every leaf in a configuration tree", () => {
    const fields = buildSchema("stellar", stellar);

    expect(fields.map((field) => field.path.join("."))).toEqual(
      expect.arrayContaining([
        "canonical.originalHost",
        "canonical.officialHosts",
        "menubar.columns",
        "menubar.items",
        "plugins.mermaid.enable",
        "style.prefers_theme",
        "style.color.theme",
      ]),
    );
  });

  it("finds fields by Chinese group name or yaml path", () => {
    const fields = buildSchema("stellar", stellar);

    expect(searchSchema(fields, "搜索引擎").some((field) => field.path[0] === "canonical")).toBe(true);
    expect(searchSchema(fields, "plugins.mermaid")).toHaveLength(1);
  });

  it("marks deployment-sensitive Hexo fields as critical", () => {
    const fields = buildSchema("hexo", { root: "/blog/", theme: "stellar", title: "Blog" });

    expect(fields.find((field) => field.path[0] === "root")?.critical).toBe(true);
    expect(fields.find((field) => field.path[0] === "title")?.critical).toBe(false);
  });

  it("uses friendly Chinese names and explanations for common settings", () => {
    const fields = buildSchema("stellar", {
      open_graph: { enable: true, twitter_id: "" },
      search: { local_search: { skip_search: [] } },
      style: { "font-size": { codeblock: "14px" } },
    });

    expect(fields.find((field) => field.path.join(".") === "open_graph.enable")?.label).toBe("生成社交分享信息");
    expect(fields.find((field) => field.path.join(".") === "search.local_search.skip_search")?.label).toBe("不参与搜索的页面");
    expect(fields.find((field) => field.path.join(".") === "style.font-size.codeblock")?.label).toBe("代码块字号");
    expect(fields.find((field) => field.path.join(".") === "open_graph.enable")?.description).toContain("分享");
  });
});
