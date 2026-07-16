import { describe, expect, it } from "vitest";
import { findWidgetReferences, renameWidget, reorderSidebar } from "../../src/renderer/src/store/widget-model";

const stellar = `site_tree:\n  home:\n    leftbar: [recent, quick_links]\n  post:\n    rightbar: toc, recent\n`;
const widgets = `recent:\n  layout: recent\nquick_links:\n  layout: linklist\n`;

describe("widget model", () => {
  it("finds every page that references a widget", () => {
    expect(findWidgetReferences(stellar, "recent")).toEqual([
      "site_tree.home.leftbar",
      "site_tree.post.rightbar",
    ]);
  });

  it("renames a widget and all sidebar references", () => {
    const renamed = renameWidget(widgets, stellar, "recent", "latest_posts");

    expect(renamed.widgets).toContain("latest_posts:");
    expect(renamed.widgets).not.toContain("recent:");
    expect(renamed.stellar).toContain("leftbar: [ latest_posts, quick_links ]");
    expect(renamed.stellar).toContain("rightbar: toc, latest_posts");
  });

  it("reorders comma-separated sidebar widgets", () => {
    expect(reorderSidebar("toc, recent, related", 2, 0)).toBe("related, toc, recent");
  });
});
