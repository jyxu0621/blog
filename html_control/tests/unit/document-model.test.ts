import { describe, expect, it } from "vitest";
import { createFields, removeDraftValue, updateDraftValue } from "../../src/renderer/src/store/document-model";
import type { ConfigDocumentSnapshot } from "../../src/shared/types";

const snapshot: ConfigDocumentSnapshot = {
  file: "stellar",
  path: "_config.stellar.yml",
  hash: "hash",
  source: "# note\nlogo:\n  title: Custom\n",
  values: { logo: { title: "Custom" } },
  defaults: { logo: { title: "Default" }, style: { prefers_theme: "auto" } },
  effective: { logo: { title: "Custom" }, style: { prefers_theme: "auto" } },
};

describe("renderer document model", () => {
  it("updates one yaml path and preserves comments", () => {
    const source = updateDraftValue(snapshot.source, ["logo", "title"], "Changed");
    expect(source).toContain("# note");
    expect(source).toContain("Changed");
  });

  it("removes an override so the field inherits its default", () => {
    const source = removeDraftValue(snapshot.source, ["logo", "title"]);
    const fields = createFields(snapshot, source);
    const title = fields.find((field) => field.schema.path.join(".") === "logo.title");

    expect(title?.effectiveValue).toBe("Default");
    expect(title?.source).toBe("default");
  });
});
