import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveLocalCover } = require("../lib/local-cover.cjs");

test("resolves an asset cover under the Hexo project root", () => {
  const checked = [];
  const result = resolveLocalCover({
    cover: "asset:cover.jpg",
    postPath: "2026/07/13/example/",
    sourcePath: "F:/blog-site/source/_posts/example.md",
    root: "/blog/",
    fileExists(path) {
      checked.push(path.replaceAll("\\", "/"));
      return true;
    },
  });

  assert.equal(result, "/blog/2026/07/13/example/cover.jpg");
  assert.deepEqual(checked, ["F:/blog-site/source/_posts/example/cover.jpg"]);
});

test("leaves remote covers unchanged", () => {
  const cover = "https://images.example.com/cover.jpg";
  assert.equal(resolveLocalCover({ cover }), cover);
});

test("rejects traversal in an asset cover", () => {
  assert.throws(
    () => resolveLocalCover({ cover: "asset:../cover.jpg" }),
    /single file name/,
  );
});

test("rejects a missing asset cover", () => {
  assert.throws(
    () => resolveLocalCover({
      cover: "asset:missing.jpg",
      postPath: "2026/07/13/example/",
      sourcePath: "F:/blog-site/source/_posts/example.md",
      root: "/blog/",
      fileExists: () => false,
    }),
    /does not exist/,
  );
});
