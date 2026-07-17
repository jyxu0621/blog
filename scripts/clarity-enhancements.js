"use strict";

const { stripHTML } = require("hexo-util");
const packageInfo = require("../package.json");

function countWords(input) {
  const text = stripHTML(String(input || ""))
    .replace(/\{%(?:.|\n)*?%\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cjk = text.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length || 0;
  const latin = text
    .replace(/[\u3400-\u9fff\uf900-\ufaff]/g, " ")
    .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length || 0;
  return cjk + latin;
}

function namesOf(collection) {
  if (!collection) return [];
  if (typeof collection.map === "function") {
    return collection.map((item) => item.name || String(item));
  }
  return [];
}

function articleType(post) {
  if (post.clarity === "story" || post.clarity === "tech") return post.clarity;
  if (post.type === "story" || post.type === "tech") return post.type;
  const categories = namesOf(post.categories);
  const tags = namesOf(post.tags);
  return categories.some((name) => /随笔|生活|旅行|摄影|故事/.test(name))
    || tags.some((name) => /摄影|旅行|生活|随笔/.test(name))
    ? "story"
    : "tech";
}

function dateValue(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
}

function serializePosts() {
  return hexo.locals.get("posts").map((post) => ({
    path: `/${String(hexo.config.root || "/").replace(/^\/+|\/+$/g, "")}/${post.path}`
      .replace(/\/{2,}/g, "/"),
    title: post.title || "",
    description: stripHTML(post.excerpt || post.description || "").trim(),
    cover: post.cover || "",
    category: namesOf(post.categories)[0] || "未分类",
    categories: namesOf(post.categories),
    tags: namesOf(post.tags),
    date: dateValue(post.date),
    updated: dateValue(post.updated),
    words: post.clarity_words || countWords(post.content),
    type: articleType(post),
  }));
}

hexo.extend.filter.register("before_post_render", function addClarityMetadata(data) {
  data.clarity_words = countWords(data.content || data.raw);
  data.clarity_type = articleType(data);
  return data;
}, 20);

hexo.extend.filter.register("after_render:html", function injectClarityData(html) {
  if (!html.includes("</body>")) return html;
  const root = hexo.config.root || "/";
  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  const doubledRoot = `${normalizedRoot}${normalizedRoot.replace(/^\//, "")}`;
  html = html.split(`href="${doubledRoot}`).join(`href="${normalizedRoot}`);
  const posts = serializePosts();
  const payload = JSON.stringify({
    root,
    posts,
    stats: {
      posts: posts.length,
      words: posts.reduce((sum, post) => sum + post.words, 0),
      categories: new Set(posts.map((post) => post.category)).size,
      started: posts.map((post) => post.date).filter(Boolean).sort()[0] || "",
      updated: posts.map((post) => post.updated || post.date).filter(Boolean).sort().at(-1) || "",
    },
    build: {
      platform: "GitHub Pages",
      imageStorage: "GitHub",
      license: packageInfo.license || "MIT",
      articleLicense: "CC BY-NC-SA 4.0",
      canonical: String(hexo.config.url || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
      hexo: packageInfo.dependencies.hexo.replace(/^[~^]/, ""),
      stellar: packageInfo.dependencies["hexo-theme-stellar"].replace(/^[~^]/, ""),
      node: "24",
      packageManager: "npm",
      ci: "Actions",
      runner: "Ubuntu",
    },
  }).replace(/</g, "\\u003c");
  return html.replace(
    "</body>",
    `<script type="application/json" id="clarity-site-data">${payload}</script></body>`,
  );
}, 20);

module.exports = { articleType, countWords };
