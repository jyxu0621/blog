(function () {
  "use strict";

  const dataNode = document.getElementById("clarity-site-data");
  if (!dataNode) return;

  let siteData;
  try {
    siteData = JSON.parse(dataNode.textContent || "{}");
  } catch (error) {
    console.warn("[clarity] Invalid site metadata", error);
    return;
  }

  const posts = Array.isArray(siteData.posts) ? siteData.posts : [];
  const normalizePath = (value) => {
    try {
      const url = new URL(value, location.origin);
      return decodeURI(url.pathname).replace(/\/{2,}/g, "/");
    } catch {
      return decodeURI(String(value || "")).replace(/\/{2,}/g, "/");
    }
  };
  const postByPath = new Map(posts.map((post) => [normalizePath(post.path), post]));
  const formatNumber = (value) => new Intl.NumberFormat("zh-CN", { notation: value > 9999 ? "compact" : "standard" }).format(value || 0);
  const relativeDuration = (value, suffix = "") => {
    const time = new Date(value).valueOf();
    if (!time) return "暂无";
    const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
    if (days < 1) return suffix ? "今天" : "不足 1 天";
    if (days < 30) return `${days} 天${suffix}`;
    const months = Math.floor(days / 30.4375);
    if (months < 12) return `${months} 个月${suffix}`;
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return `${years} 年${rest ? ` ${rest} 个月` : ""}${suffix}`;
  };
  const escapeHTML = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

  function enhanceCards() {
    const cards = [...document.querySelectorAll(".post-list.post > a.post-card.post")];
    cards.forEach((card, index) => {
      const post = postByPath.get(normalizePath(card.getAttribute("href")));
      if (!post) return;
      card.classList.add(`clarity-${post.type || "tech"}`);
      card.style.setProperty("--clarity-item-delay", `${Math.min(index * 0.05, 0.4)}s`);
      card.dataset.title = post.title.toLocaleLowerCase("zh-CN");
      card.dataset.category = post.category;
      card.dataset.date = post.date || "";
      card.dataset.updated = post.updated || post.date || "";

      const meta = card.querySelector(".meta.cap");
      if (meta && post.words && !meta.querySelector(".clarity-words")) {
        const words = document.createElement("span");
        words.className = "clarity-words";
        words.innerHTML = `<span aria-hidden="true">¶</span> ${formatNumber(post.words)}字`;
        meta.append(words);
      }

      if (meta && post.tags?.length && !meta.querySelector(".clarity-tag")) {
        post.tags.slice(0, 2).forEach((tag) => {
          const badge = document.createElement("span");
          badge.className = "clarity-tag";
          badge.textContent = `#${tag}`;
          meta.append(badge);
        });
      }
    });
    return cards;
  }

  function createToolbar(cards) {
    const list = document.querySelector(".post-list.post");
    if (!list || !cards.length || list.querySelector(".clarity-toolbar")) return;
    const categories = [...new Set(cards.map((card) => card.dataset.category).filter(Boolean))];
    const toolbar = document.createElement("div");
    toolbar.className = "clarity-toolbar";
    toolbar.innerHTML = `
      <button type="button" class="active" data-category="">全部</button>
      ${categories.map((category) => `<button type="button" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("")}
      <span class="clarity-toolbar-spacer"></span>
      <button type="button" data-sort="date">按创建日期</button>
      <button type="button" data-sort="updated">按更新日期</button>`;
    list.prepend(toolbar);
    let activeCategory = "";
    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.hasAttribute("data-category")) {
        activeCategory = button.dataset.category || "";
        toolbar.querySelectorAll("[data-category]").forEach((item) => item.classList.toggle("active", item === button));
        cards.forEach((card) => { card.hidden = Boolean(activeCategory && card.dataset.category !== activeCategory); });
      }
      if (button.dataset.sort) {
        const field = button.dataset.sort;
        cards.sort((a, b) => String(b.dataset[field]).localeCompare(String(a.dataset[field])));
        cards.forEach((card) => list.append(card));
        toolbar.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("active", item === button));
      }
    });
  }

  function createStatsWidget() {
    if (!document.querySelector(".post-list.post, .post-list.archives")) return;
    const rightWidgets = document.querySelector(".l_right .widgets");
    if (!rightWidgets || rightWidgets.querySelector(".clarity-stats-widget")) return;
    const stats = siteData.stats || {};
    const started = stats.started
      || posts.map((post) => post.date).filter(Boolean).sort()[0]
      || "";
    const updated = stats.updated
      || posts.map((post) => post.updated || post.date).filter(Boolean).sort().at(-1)
      || "";
    const build = {
      platform: "GitHub Pages",
      imageStorage: "GitHub",
      license: "MIT",
      articleLicense: "CC BY-NC-SA 4.0",
      canonical: "jyxu0621.github.io/blog",
      hexo: "8.1.2",
      stellar: "1.33.1",
      node: "24",
      packageManager: "npm",
      ci: "Actions",
      runner: "Ubuntu",
      ...(siteData.build || {}),
    };
    const widget = document.createElement("widget");
    widget.className = "widget-wrapper clarity-stats-widget";
    widget.innerHTML = `
      <div class="widget-header dis-select"><span class="name">博客统计</span></div>
      <div class="clarity-post-stats">
        <div><span>运营时长</span><strong>${relativeDuration(started)}</strong></div>
        <div><span>上次更新</span><strong>${relativeDuration(updated, "前")}</strong></div>
        <div><span>总字数</span><strong>${formatNumber(stats.words)}</strong></div>
      </div>
      <div class="widget-header clarity-build-title dis-select"><span class="name">技术信息</span></div>
      <div class="clarity-build-card">
        <dl class="clarity-build-list">
          <div><dt>构建平台</dt><dd>${escapeHTML(build.platform)}</dd></div>
          <div><dt>图片存储</dt><dd>${escapeHTML(build.imageStorage)}</dd></div>
          <div><dt>软件协议</dt><dd>${escapeHTML(build.license)}</dd></div>
          <div><dt>文章许可</dt><dd>${escapeHTML(build.articleLicense)}</dd></div>
          <div><dt>规范域名</dt><dd>${escapeHTML(build.canonical)}</dd></div>
        </dl>
        <details class="clarity-build-details" open>
          <summary><span class="clarity-build-collapse">收起构建信息</span><span class="clarity-build-expand">展开构建信息</span></summary>
          <div class="clarity-build-grid">
            <div><span>Blog</span><strong>Hexo ${escapeHTML(build.hexo)}</strong></div>
            <div><span>Theme</span><strong>Stellar ${escapeHTML(build.stellar)}</strong></div>
            <div><span>Node</span><strong>v${escapeHTML(build.node)}</strong></div>
            <div><span>Package</span><strong>${escapeHTML(build.packageManager)}</strong></div>
            <div><span>CI</span><strong>${escapeHTML(build.ci)}</strong></div>
            <div><span>Runner</span><strong>${escapeHTML(build.runner)}</strong></div>
          </div>
        </details>
      </div>`;
    rightWidgets.prepend(widget);
  }

  function enhanceCurrentPost() {
    const post = postByPath.get(normalizePath(location.pathname));
    if (!post) return;
    document.body.classList.add(`clarity-${post.type || "tech"}`);
    const bannerInfo = document.querySelector(".article.banner .bread-nav, .article.banner .bottom");
    if (bannerInfo && post.words && !bannerInfo.querySelector(".clarity-post-meta")) {
      const span = document.createElement("span");
      span.className = "clarity-post-meta";
      span.innerHTML = `<span aria-hidden="true">¶</span>${formatNumber(post.words)}字`;
      bannerInfo.append(span);
    }
  }

  function enhanceCodeBlocks() {
    document.querySelectorAll(".md-text .highlight").forEach((block) => {
      const rows = block.querySelectorAll(".line").length || (block.textContent.match(/\n/g)?.length || 0) + 1;
      if (rows <= 24 || block.closest(".clarity-code-wrap")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "clarity-code-wrap is-collapsible";
      block.before(wrapper);
      wrapper.append(block);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "clarity-code-toggle";
      button.textContent = `展开全部 ${rows} 行`;
      button.addEventListener("click", () => {
        const expanded = wrapper.classList.toggle("expanded");
        button.textContent = expanded ? "收起代码" : `展开全部 ${rows} 行`;
      });
      wrapper.append(button);
    });
  }

  function enhanceArchive() {
    const archive = document.querySelector(".post-list.archives #archive");
    if (!archive || archive.querySelector(".clarity-archive-tools")) return;
    const links = [...archive.querySelectorAll(".archive-list a.post")];
    const groups = [];
    [...archive.querySelectorAll(":scope > .archive-header")].forEach((header) => {
      const group = document.createElement("section");
      group.className = "clarity-archive-year";
      header.before(group);
      group.append(header);
      let sibling = group.nextElementSibling;
      while (sibling?.classList.contains("archive-list")) {
        const next = sibling.nextElementSibling;
        group.append(sibling);
        sibling = next;
      }
      groups.push(group);
    });
    const controls = document.createElement("div");
    controls.className = "clarity-archive-tools";
    controls.innerHTML = `<span>${links.length} 篇文章</span><button type="button" class="active" data-order="desc">由新到旧</button><button type="button" data-order="asc">由旧到新</button>`;
    archive.prepend(controls);
    let currentOrder = "desc";
    controls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-order]");
      if (!button || button.dataset.order === currentOrder) return;
      currentOrder = button.dataset.order;
      groups.reverse().forEach((group) => {
        [...group.querySelectorAll(":scope > .archive-list")]
          .reverse()
          .forEach((list) => group.append(list));
        archive.append(group);
      });
      controls.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    });
  }

  function enhanceSearch() {
    const wrapper = document.querySelector(".search-wrapper");
    const input = wrapper?.querySelector("input");
    if (!wrapper || !input || document.querySelector(".clarity-search-backdrop")) return;
    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "clarity-search-backdrop";
    backdrop.setAttribute("aria-label", "关闭搜索");
    document.body.append(backdrop);
    const close = () => document.body.classList.remove("clarity-search-open");
    input.addEventListener("focus", () => document.body.classList.add("clarity-search-open"));
    backdrop.addEventListener("click", close);
    wrapper.addEventListener("click", (event) => {
      if (event.target.closest("a")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
        input.blur();
      }
    });
  }

  function enhanceFooter() {
    const iconMap = [[/订阅|Atom/i, "◉"], [/GitHub/i, "⌘"], [/分类/, "▤"], [/标签/, "#"], [/归档/, "◫"], [/主页|发布/, "⌂"]];
    document.querySelectorAll(".page-footer .sitemap-group a").forEach((link) => {
      if (link.querySelector(".clarity-footer-icon")) return;
      const icon = iconMap.find(([pattern]) => pattern.test(link.textContent))?.[1] || "→";
      link.insertAdjacentHTML("afterbegin", `<span class="clarity-footer-icon" aria-hidden="true">${icon}</span>`);
    });
  }

  const cards = enhanceCards();
  createToolbar(cards);
  createStatsWidget();
  enhanceCurrentPost();
  enhanceCodeBlocks();
  enhanceArchive();
  enhanceSearch();
  enhanceFooter();
})();
