const tabs = {
  "精选情报": "按信源等级、经营影响和风险价值筛选后的重点信息。",
  "全部动态": "保留抓取到的国内道路客运相关信息，按时间和分数排序。",
  "客运日报": "根据情报时间线按自然日提炼摘要，适合早会快速浏览。",
  "经营借鉴": "同行转型、客运站复合经营、定制客运和交旅融合案例。",
  "广东招标": "广东省内通勤、上下班班车、车辆租赁和包车采购机会。",
  "政策监管": "政府政策、监管要求、行业通知和地方试点。",
  "风险预警": "安全监管、事故隐患、处罚整治和合规风险。",
  "信源中心": "查看当前分级监控的官方、协会、地方和行业媒体信源。",
  "反馈": "提交错漏、信源建议和希望重点关注的经营情报方向。",
};

const state = {
  tab: "精选情报",
  q: "",
  articles: [],
  briefing: null,
  sources: [],
};

const el = {
  shell: document.getElementById("shell"),
  sidebarOpenBtn: document.getElementById("sidebarOpenBtn"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  nav: document.getElementById("nav"),
  pageTitle: document.getElementById("pageTitle"),
  pageSub: document.getElementById("pageSub"),
  searchInput: document.getElementById("searchInput"),
  metrics: document.getElementById("metrics"),
  feedView: document.getElementById("feedView"),
  briefingView: document.getElementById("briefingView"),
  sourceView: document.getElementById("sourceView"),
  feedbackView: document.getElementById("feedbackView"),
  articleList: document.getElementById("articleList"),
  resultMeta: document.getElementById("resultMeta"),
  statusPill: document.getElementById("statusPill"),
  briefingMeta: document.getElementById("briefingMeta"),
  briefingHeadline: document.getElementById("briefingHeadline"),
  briefingSummary: document.getElementById("briefingSummary"),
  briefingSections: document.getElementById("briefingSections"),
  sourceList: document.getElementById("sourceList"),
  feedbackForm: document.getElementById("feedbackForm"),
  feedbackStatus: document.getElementById("feedbackStatus"),
  feedbackSubmit: document.getElementById("feedbackSubmit"),
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`请求失败：${response.status}`);
  return response.json();
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(String(value || "").slice(0, 16));
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(" ", "<br>");
}

function scoreClass(item) {
  if (item.category === "风险预警") return "risk";
  if (item.category === "经营借鉴") return "biz";
  if (item.score < 75) return "mid";
  return "";
}

function hasUsableUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function articleTitle(item) {
  const title = escapeHtml(item.title);
  if (!hasUsableUrl(item.url)) return `<span class="article-title">${title}</span>`;
  return `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${title}</a>`;
}

function originalLink(item) {
  if (!hasUsableUrl(item.url)) return "";
  return `<a class="original-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">查看原文</a>`;
}

function setTab(tab) {
  state.tab = tab;
  el.pageTitle.textContent = tab;
  el.pageSub.textContent = tabs[tab];
  el.nav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  renderActiveView();
  if (["精选情报", "全部动态", "经营借鉴", "广东招标", "政策监管", "风险预警"].includes(tab)) loadArticles();
  if (tab === "客运日报") loadBriefing();
  if (tab === "信源中心") loadSources();
}

function renderActiveView() {
  const showFeed = ["精选情报", "全部动态", "经营借鉴", "广东招标", "政策监管", "风险预警"].includes(state.tab);
  el.feedView.classList.toggle("hidden", !showFeed);
  el.briefingView.classList.toggle("hidden", state.tab !== "客运日报");
  el.sourceView.classList.toggle("hidden", state.tab !== "信源中心");
  el.feedbackView.classList.toggle("hidden", state.tab !== "反馈");
  el.metrics.classList.toggle("hidden", state.tab === "反馈");
  el.searchInput.disabled = !showFeed;
}

function collapseSidebar() {
  el.shell.classList.add("sidebar-collapsed");
  el.sidebarOpenBtn.classList.add("visible");
}

function expandSidebar() {
  el.shell.classList.remove("sidebar-collapsed");
  el.sidebarOpenBtn.classList.remove("visible");
}

async function loadArticles() {
  const params = new URLSearchParams({ tab: state.tab, q: state.q });
  const data = await api(`/api/articles?${params.toString()}`);
  state.articles = data.articles || [];
  renderMetrics();
  renderArticles();
}

async function loadBriefing() {
  const data = await api("/api/briefing");
  state.briefing = data.briefing;
  renderMetrics();
  renderBriefing();
}

async function loadSources() {
  const data = await api("/api/sources");
  state.sources = data.sources || [];
  renderSources();
}

function renderMetrics() {
  const articles = state.articles.length ? state.articles : [];
  const total = articles.length;
  const featured = articles.filter((item) => item.featured).length;
  const risks = articles.filter((item) => item.category === "风险预警").length;
  const business = articles.filter((item) => item.category === "经营借鉴").length;
  el.metrics.innerHTML = [
    metric(total, "缓存情报"),
    metric(featured, "精选"),
    metric(business, "经营借鉴"),
    metric(risks, "风险预警"),
  ].join("");
}

function metric(value, label) {
  return `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderArticles() {
  el.resultMeta.textContent = `${state.tab} · ${state.articles.length} 条`;
  el.statusPill.textContent = state.q ? `搜索：${state.q}` : "缓存结果";
  if (!state.articles.length) {
    el.articleList.innerHTML = `<div class="empty">暂无符合条件的客运情报</div>`;
    return;
  }
  el.articleList.innerHTML = state.articles.map((item) => `
    <article class="article">
      <div class="time">${formatTime(item.publishedAt)}</div>
      <div>
        ${articleTitle(item)}
        <div class="meta">${escapeHtml(item.sourceName)} · ${escapeHtml(item.sourceTier)} · ${escapeHtml(item.region)}</div>
        <p class="summary">${escapeHtml(item.summary)}</p>
        <div class="reason">${escapeHtml(item.reason)}</div>
        <div class="tag-row">
          <span class="tag category">${escapeHtml(item.category)}</span>
          ${item.featured ? `<span class="tag featured">精选</span>` : ""}
          ${(item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="article-actions">${originalLink(item)}</div>
      </div>
      <div class="score ${scoreClass(item)}">${item.score}<small>质量分</small></div>
    </article>
  `).join("");
}

function renderBriefing() {
  const briefing = state.briefing;
  if (!briefing) return;
  el.briefingMeta.textContent = `${briefing.date} · 来自情报时间线 ${briefing.totalArticles ?? briefing.totalFeatured ?? 0} 条 · ${formatPlainTime(briefing.generatedAt)}`;
  el.briefingHeadline.textContent = briefing.headline;
  el.briefingSummary.textContent = briefing.summary;
  el.briefingSections.innerHTML = (briefing.sections || []).map((section) => `
    <div class="brief-section">
      <h3>${escapeHtml(section.category)}</h3>
      ${section.summary ? `<p class="brief-section-summary">${escapeHtml(section.summary)}</p>` : ""}
      ${section.items.map((item) => `
        <article class="brief-item">
          <div class="brief-title">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.score)}分</span>
          </div>
          <div class="tag-row">
            <span class="tag category">${escapeHtml(item.category || "情报")}</span>
            ${(item.tags || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <p>${escapeHtml(item.summary || "暂无摘要")}</p>
          <div class="brief-reason">经营判断：${escapeHtml(item.reason || "建议持续关注后续进展。")}</div>
          <div class="brief-foot">
            <span>${escapeHtml(item.sourceName)} · ${escapeHtml(item.sourceTier)} · ${escapeHtml(item.region)}</span>
            ${originalLink(item)}
          </div>
        </article>
      `).join("")}
    </div>
  `).join("") || `<div class="empty">暂无日报内容</div>`;
}

function renderSources() {
  el.sourceList.innerHTML = state.sources.map((source) => `
    <div class="source-card">
      <span class="tier">${escapeHtml(source.tier)}</span>
      <strong>${escapeHtml(source.name)}</strong>
      <p>${escapeHtml(source.type)} · ${escapeHtml(source.region)} · 优先级 ${escapeHtml(source.priority)}</p>
      <p>${escapeHtml(source.url)}</p>
    </div>
  `).join("");
}

function formatPlainTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

async function submitFeedback(event) {
  event.preventDefault();
  el.feedbackSubmit.disabled = true;
  el.feedbackStatus.textContent = "正在提交";
  try {
    const formData = Object.fromEntries(new FormData(el.feedbackForm).entries());
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!response.ok) throw new Error(`提交失败：${response.status}`);
    el.feedbackForm.reset();
    el.feedbackStatus.textContent = "已提交，感谢反馈。";
  } catch (error) {
    el.feedbackStatus.textContent = error.message;
  } finally {
    el.feedbackSubmit.disabled = false;
  }
}

let searchTimer;
el.nav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tab]");
  if (button) {
    setTab(button.dataset.tab);
    collapseSidebar();
  }
});
el.sidebarCloseBtn.addEventListener("click", collapseSidebar);
el.sidebarOpenBtn.addEventListener("click", expandSidebar);
el.searchInput.addEventListener("input", () => {
  state.q = el.searchInput.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadArticles, 250);
});
el.feedbackForm.addEventListener("submit", submitFeedback);

Promise.all([loadArticles()]).catch((error) => {
  el.articleList.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});
