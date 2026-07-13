"use strict";

const path = require("node:path");
const { existsSync } = require("node:fs");

const LOCAL_COVER_PREFIX = "asset:";

function resolveLocalCover({
  cover,
  postPath,
  sourcePath,
  root = "/",
  fileExists = existsSync,
}) {
  if (typeof cover !== "string" || !cover.startsWith(LOCAL_COVER_PREFIX)) {
    return cover;
  }

  const filename = cover.slice(LOCAL_COVER_PREFIX.length).trim();
  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    path.basename(filename) !== filename ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    throw new Error("A local cover must use a single file name after asset:");
  }

  if (!postPath || !sourcePath) {
    throw new Error(`Cannot resolve local cover ${filename}: post metadata is incomplete`);
  }

  const assetDirectory = path.join(
    path.dirname(sourcePath),
    path.basename(sourcePath, path.extname(sourcePath)),
  );
  const assetPath = path.join(assetDirectory, filename);
  if (!fileExists(assetPath)) {
    throw new Error(`Local cover does not exist: ${assetPath}`);
  }

  const normalizedRoot = `/${String(root).replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");
  const normalizedPostPath = String(postPath).replaceAll("\\", "/");
  const postDirectory = normalizedPostPath.endsWith("/")
    ? normalizedPostPath
    : `${path.posix.dirname(normalizedPostPath)}/`;

  return path.posix.join(normalizedRoot, postDirectory, encodeURIComponent(filename));
}

module.exports = { LOCAL_COVER_PREFIX, resolveLocalCover };
