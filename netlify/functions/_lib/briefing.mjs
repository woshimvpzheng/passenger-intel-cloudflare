import { beijingDateKey } from "./time.mjs";

export function buildBriefing(articles) {
  const timeline = [...articles].sort(byTime);
  const sections = buildDailySections(timeline);

  const top = timeline[0] || null;
  return {
    date: top ? articleDateKey(top.publishedAt) : beijingDateKey(),
    headline: top ? top.title : "暂无客运情报",
    summary: top ? top.reason : "等待首次抓取后生成客运日报。",
    generatedAt: new Date().toISOString(),
    totalFeatured: timeline.length,
    totalArticles: timeline.length,
    sections,
  };
}

function buildDailySections(articles) {
  const groups = new Map();
  for (const article of articles) {
    const date = articleDateKey(article.publishedAt);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(article);
  }

  return [...groups.entries()].map(([date, items]) => ({
    category: date,
    summary: dailySummary(items),
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      sourceName: item.sourceName,
      sourceTier: item.sourceTier,
      region: item.region,
      url: item.url,
      score: item.score,
      category: item.category,
      summary: item.summary,
      reason: item.reason,
      tags: item.tags || [],
    })),
  }));
}

function dailySummary(items) {
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))];
  const top = items[0];
  if (!top) return "";
  const categoryText = categories.length ? categories.join("、") : "综合情报";
  return `本日情报 ${items.length} 条，重点集中在${categoryText}。建议优先关注：${top.reason || top.summary || top.title}`;
}

function byTime(a, b) {
  return timeValue(b.publishedAt) - timeValue(a.publishedAt) || (b.score || 0) - (a.score || 0);
}

function articleDateKey(value) {
  const text = String(value || "").trim();
  const direct = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (direct) {
    const [, year, month, day] = direct;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? beijingDateKey() : beijingDateKey(date);
}

function timeValue(value) {
  const text = String(value || "").trim();
  const normalized = /^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}/.test(text) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)
    ? `${text.replace(" ", "T")}+08:00`
    : text;
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : 0;
}
