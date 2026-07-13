"use strict";

const path = require("node:path");
const { resolveLocalCover } = require("../lib/local-cover.cjs");

hexo.extend.filter.register("before_post_render", function resolvePostCover(data) {
  if (typeof data.cover !== "string" || !data.cover.startsWith("asset:")) {
    return data;
  }

  const sourcePath = data.full_source || path.join(hexo.source_dir, data.source || "");
  data.cover = resolveLocalCover({
    cover: data.cover,
    postPath: data.path,
    sourcePath,
    root: hexo.config.root,
  });
  return data;
});
