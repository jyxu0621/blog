import { describe, expect, it } from "vitest";
import {
  resolveDefaultBlogRoot,
  resolvePackagedBlogRoot,
  resolvePreloadPath,
  resolvePortableBlogRoot,
  validateBlogRoot,
} from "../../src/main/services/project-service";

describe("project service", () => {
  it("defaults to the parent of html_control", () => {
    expect(resolveDefaultBlogRoot("F:\\blog-site\\html_control")).toBe("F:\\blog-site");
  });

  it("resolves the blog root from a portable executable release directory", () => {
    expect(resolvePortableBlogRoot("F:\\blog-site\\html_control\\release")).toBe("F:\\blog-site");
  });

  it("resolves the blog root from electron-builder's win-unpacked executable", () => {
    expect(resolvePackagedBlogRoot("F:\\blog-site\\html_control\\release\\win-unpacked\\Stellar 本地主题控制台.exe")).toBe("F:\\blog-site");
  });

  it("points Electron at the CommonJS preload artifact required by the sandbox", () => {
    expect(resolvePreloadPath("F:\\app\\out\\main")).toBe("F:\\app\\out\\preload\\index.cjs");
  });

  it("rejects a directory without Hexo and Stellar markers", async () => {
    await expect(validateBlogRoot("F:\\not-a-blog")).rejects.toThrow("不是可识别的 Hexo Stellar 项目");
  });
});
