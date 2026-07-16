// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveActionBar } from "../../src/renderer/src/components/SaveActionBar";

afterEach(cleanup);

describe("SaveActionBar", () => {
  it("always explains the save and publish workflow", () => {
    render(<SaveActionBar dirtyCount={0} busy={false} compatible onSave={vi.fn()} />);

    expect(screen.getByText("当前配置已保存")).toBeInTheDocument();
    expect(screen.getByText(/发布仍在 HexoHub 完成/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存并应用配置" })).toBeDisabled();
  });

  it("enables the primary save action when files changed", () => {
    const onSave = vi.fn();
    render(<SaveActionBar dirtyCount={2} busy={false} compatible onSave={onSave} />);

    expect(screen.getByText("2 个配置文件有未保存修改")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "保存并应用配置" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledOnce();
  });
});
