import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
global.hexo = {
  extend: { filter: { register() {} } },
};
const { articleType, countWords } = require("../scripts/clarity-enhancements.js");

test("counts Chinese characters and Latin words", () => {
  assert.equal(countWords("你好，Clarity for Stellar 3"), 6);
});

test("strips HTML and Stellar tags before counting", () => {
  assert.equal(countWords("<p>你好 <strong>world</strong></p>{% image cover.jpg %}"), 3);
});

test("chooses story layout from explicit metadata", () => {
  assert.equal(articleType({ clarity: "story" }), "story");
});

test("infers story layout from category or tag", () => {
  const collection = (items) => ({ map: (callback) => items.map(callback) });
  assert.equal(articleType({ categories: collection([{ name: "随笔" }]) }), "story");
  assert.equal(articleType({ tags: collection([{ name: "摄影" }]) }), "story");
  assert.equal(articleType({ categories: collection([{ name: "技术" }]) }), "tech");
});

test("Clarity assets expose all four implementation phases", () => {
  const css = readFileSync(new URL("../source/css/clarity-system.css", import.meta.url), "utf8");
  const js = readFileSync(new URL("../source/js/clarity-ui.js", import.meta.url), "utf8");
  for (const marker of [
    ".clarity-tech", ".clarity-story", ".clarity-tags",
    ".clarity-toolbar", ".clarity-code-wrap", ".clarity-archive-tools",
    ".clarity-build-card", ".clarity-build-grid",
  ]) assert.ok(css.includes(marker), `missing CSS marker ${marker}`);
  for (const functionName of [
    "enhanceCards", "createToolbar", "createStatsWidget",
    "enhanceCodeBlocks", "enhanceArchive", "enhanceFooter",
  ]) assert.ok(js.includes(`function ${functionName}`), `missing function ${functionName}`);
  for (const label of ["运营时长", "上次更新", "技术信息", "规范域名", "Stellar"]) {
    assert.ok(js.includes(label), `missing sidebar label ${label}`);
  }
});
