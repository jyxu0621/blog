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
});
