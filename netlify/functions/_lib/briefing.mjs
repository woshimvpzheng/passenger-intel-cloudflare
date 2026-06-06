import { beijingDateKey } from "./time.mjs";

export function buildBriefing(articles) {
  const featured = articles.filter((item) => item.featured).sort((a, b) => b.score - a.score);
  const sections = [
    section("政策监管", featured),
    section("经营借鉴", featured),
    section("线路运营", featured),
    section("客流市场", featured),
    section("票价补贴", featured),
    section("风险预警", featured),
    section("区域动态", featured),
  ].filter((item) => item.items.length);

  const top = featured[0] || articles[0] || null;
  return {
    date: beijingDateKey(),
    headline: top ? top.title : "暂无客运情报",
    summary: top ? top.reason : "等待首次抓取后生成客运日报。",
    generatedAt: new Date().toISOString(),
    totalFeatured: featured.length,
    sections,
  };
}

function section(category, articles) {
  return {
    category,
    items: articles.filter((item) => item.category === category).slice(0, 8).map((item) => ({
      id: item.id,
      title: item.title,
      sourceName: item.sourceName,
      sourceTier: item.sourceTier,
      region: item.region,
      url: item.url,
      score: item.score,
      summary: item.summary,
      reason: item.reason,
      tags: item.tags || [],
    })),
  };
}
