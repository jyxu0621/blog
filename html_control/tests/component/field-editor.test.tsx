// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FieldEditor } from "../../src/renderer/src/components/FieldEditor";
import type { EffectiveField } from "../../src/shared/types";

describe("FieldEditor", () => {
  it("renders source information and updates a boolean", () => {
    const onChange = vi.fn();
    const field: EffectiveField = {
      schema: {
        file: "stellar",
        path: ["plugins", "mermaid", "enable"],
        label: "启用",
        description: "图表插件",
        type: "boolean",
        group: "功能插件",
      },
      defaultValue: false,
      overrideValue: true,
      effectiveValue: true,
      source: "override",
      dirty: false,
      errors: [],
    };

    render(<FieldEditor field={field} onChange={onChange} onRestoreDefault={() => undefined} />);

    expect(screen.getByText("用户覆盖")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("adds an entry to an array field", () => {
    const onChange = vi.fn();
    const field: EffectiveField = {
      schema: {
        file: "stellar",
        path: ["canonical", "officialHosts"],
        label: "官方主机",
        description: "备用站主机",
        type: "array",
        group: "SEO 与主站",
      },
      defaultValue: [],
      overrideValue: ["localhost"],
      effectiveValue: ["localhost"],
      source: "override",
      dirty: false,
      errors: [],
    };

    render(<FieldEditor field={field} onChange={onChange} onRestoreDefault={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "添加项目" }));
    expect(onChange).toHaveBeenCalledWith(["localhost", ""]);
  });
});
