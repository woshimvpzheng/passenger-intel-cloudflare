import { jsonResponse, legacyHandler } from "./_lib/http.mjs";
import { readState } from "./_lib/storage.mjs";

export default async function articles(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const state = await readState();
  const articles = filterArticles(state.articles, query);
  const clusters = attachClusters(articles, state.clusters);
  return jsonResponse({ ok: true, articles, clusters, total: articles.length });
}

export const config = { path: "/api/articles" };
export const handler = legacyHandler(articles);

function filterArticles(articles, query) {
  const tab = query.tab || "精选情报";
  const keyword = (query.q || "").trim();
  const limit = Math.min(Number(query.limit || 120), 300);
  const filtered = articles
    .filter((item) => {
      if (tab === "精选情报" && !item.featured) return false;
      if (tab === "经营借鉴" && item.category !== "经营借鉴") return false;
      if (tab === "政策监管" && item.category !== "政策监管") return false;
      if (tab === "风险预警" && item.category !== "风险预警") return false;
      if (tab === "广东招标" && !(item.category === "招标采购" && /广东|广州|深圳|东莞|佛山|珠海|中山|惠州|江门|肇庆|清远|韶关|汕头|湛江|茂名|梅州|汕尾|河源|阳江|潮州|揭阳|云浮/.test(`${item.region} ${item.title} ${item.summary}`))) return false;
      if (keyword) {
        const text = `${item.title} ${item.summary} ${item.reason} ${item.sourceName} ${item.region} ${item.tags?.join(" ")}`;
        if (!text.includes(keyword)) return false;
      }
      return true;
    })
  const byTime = (a, b) => timeValue(b.publishedAt) - timeValue(a.publishedAt) || b.score - a.score;
  const byImpact = (a, b) => (b.featured - a.featured) || b.score - a.score || byTime(a, b);
  return filtered.sort(tab === "全部动态" || tab === "广东招标" ? byTime : byImpact).slice(0, limit);
}

export function timeValue(value) {
  const text = String(value || "").trim();
  const normalized = /^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}/.test(text) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)
    ? `${text.replace(" ", "T")}+08:00`
    : text;
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : 0;
}

function attachClusters(articles, clusters) {
  const ids = new Set(articles.map((item) => item.id));
  return clusters.filter((cluster) => ids.has(cluster.masterId) || cluster.relatedIds?.some((id) => ids.has(id)));
}
