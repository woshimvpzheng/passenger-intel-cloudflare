import crypto from "node:crypto";
import { sourceThreshold, sourceWeight } from "./sources.mjs";

export const categories = ["政策监管", "经营借鉴", "线路运营", "客流市场", "票价补贴", "风险预警", "招标采购", "区域动态"];

const roadKeywords = [
  "道路客运", "班线客运", "班车客运", "客运班线", "定制客运", "农村客运", "城乡客运",
  "城际客运", "旅游包车", "包车客运", "客运站", "汽车客运", "公路客运", "道路旅客运输",
  "道路运输", "客运企业", "客运集团", "旅客运输", "客运服务", "交旅融合", "通勤班车", "员工班车",
  "上下班班车", "班车租赁", "客车租赁", "大巴租赁", "车辆租赁", "车辆接送", "通勤车", "接送服务",
];

const relevantKeywords = [
  ...roadKeywords,
  "交通运输", "综合交通", "出行服务", "运输服务", "春运", "暑运", "道路水路",
  "票价", "补贴", "线路", "班次", "站场", "安全生产", "监管", "执法", "处罚",
  "招标", "采购", "政府采购", "投标", "中标", "成交", "结果公告", "招标公告", "采购公告", "磋商公告",
  "租赁服务", "包车服务", "班车服务", "通勤", "上下班", "厂车", "校车", "大巴", "客车",
];

const foreignKeywords = ["国外", "海外", "美国", "欧洲", "日本", "韩国", "印度", "越南", "泰国", "跨境", "国际客运"];
const nonRoadOnlyKeywords = ["铁路", "高铁", "民航", "航班", "机场", "水运", "港口", "邮轮", "地铁", "航运"];
const domesticHints = ["中国", "全国", "国务院", "交通运输部", "省", "市", "县", "北京", "上海", "天津", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", "海南", "四川", "贵州", "云南", "陕西", "甘肃", "青海", "宁夏", "新疆", "西藏", "内蒙古"];

const categoryRules = [
  { category: "招标采购", words: ["招标", "采购", "投标", "中标", "成交", "结果公告", "招标公告", "采购公告", "磋商公告", "租赁服务", "通勤", "上下班", "班车租赁", "车辆租赁", "包车"], base: 30 },
  { category: "政策监管", words: ["政策", "通知", "规定", "办法", "方案", "许可", "改革", "监管", "交通运输部", "交通运输厅"], base: 28 },
  { category: "经营借鉴", words: ["经营", "转型", "交旅融合", "定制客运", "平台", "客运站", "旅游", "融合", "品牌", "增值服务"], base: 26 },
  { category: "线路运营", words: ["线路", "班线", "班次", "开通", "恢复", "停运", "调整", "发车", "站场"], base: 24 },
  { category: "客流市场", words: ["客流", "旅客", "发送", "春运", "暑运", "假期", "出行需求", "运量"], base: 22 },
  { category: "票价补贴", words: ["票价", "补贴", "资金", "收费", "免费", "优惠", "成本", "财政"], base: 24 },
  { category: "风险预警", words: ["安全", "事故", "隐患", "处罚", "执法", "整治", "约谈", "违法", "动态监控"], base: 30 },
  { category: "区域动态", words: ["省", "市", "县", "区域", "地方", "试点", "示范"], base: 14 },
];

export function normalizeText(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRelevantPassengerNews(item) {
  const text = `${item.title || ""} ${item.content || ""} ${item.sourceName || ""} ${item.region || ""}`;
  if (foreignKeywords.some((word) => text.includes(word))) return false;
  const roadHit = roadKeywords.some((word) => text.includes(word));
  const relevantHit = relevantKeywords.some((word) => text.includes(word));
  if (!roadHit && !relevantHit) return false;
  const nonRoadHits = nonRoadOnlyKeywords.filter((word) => text.includes(word)).length;
  if (nonRoadHits && !roadHit && !text.includes("交通运输")) return false;
  return domesticHints.some((word) => text.includes(word)) || item.region !== "国外";
}

export function classify(item) {
  const text = `${item.title || ""} ${item.content || ""} ${item.sourceName || ""}`;
  let winner = { category: "区域动态", points: 0, tags: [] };
  for (const rule of categoryRules) {
    const hits = rule.words.filter((word) => text.includes(word));
    const points = hits.length ? rule.base + hits.length * 5 : 0;
    if (points > winner.points) winner = { category: rule.category, points, tags: hits.slice(0, 5) };
  }
  return winner;
}

export function fallbackDimensions(item, source) {
  const { category, points } = classify(item);
  const authority = source?.tier === "T1" ? 92 : source?.tier === "T1.5" ? 78 : 62;
  return {
    policyImpact: category === "政策监管" ? 84 : Math.min(76, 38 + points),
    businessValue: category === "经营借鉴" || category === "招标采购" ? 86 : Math.min(78, 42 + points),
    riskLevel: category === "风险预警" ? 88 : Math.min(56, 18 + points),
    timeliness: 70,
    sourceAuthority: authority,
  };
}

export function finalScore(dimensions, source, category) {
  const weighted =
    dimensions.policyImpact * 0.24 +
    dimensions.businessValue * 0.28 +
    dimensions.riskLevel * 0.16 +
    dimensions.timeliness * 0.16 +
    dimensions.sourceAuthority * 0.16;
  const categoryBoost = category === "风险预警" ? 5 : category === "经营借鉴" ? 4 : category === "招标采购" ? 4 : category === "政策监管" ? 3 : 0;
  const authorityBoost = source?.tier === "T1" ? 5 : source?.tier === "T1.5" ? 3 : 1;
  const cap = category === "风险预警" ? 95 : ["政策监管", "经营借鉴", "招标采购"].includes(category) ? 92 : 88;
  return Math.max(0, Math.min(cap, Math.round(weighted * 0.88 + authorityBoost + categoryBoost)));
}

export function shortSummary(item) {
  const text = normalizeText(item.content || item.title || "");
  const parts = text.split(/[。！？；]/).map((part) => part.trim()).filter(Boolean);
  return (parts.slice(0, 2).join("。") || item.title || "").slice(0, 150);
}

export function recommendation(category, score) {
  if (category === "政策监管") return "涉及政策或监管口径变化，建议评估对线路审批、服务组织和合规管理的影响。";
  if (category === "经营借鉴") return "包含同行经营策略或转型动作，可重点关注其客源组织、站场利用和增收路径。";
  if (category === "线路运营") return "涉及线路、班次、站场或运力变化，可能影响客源覆盖和排班安排。";
  if (category === "票价补贴") return "涉及票价、补贴或资金安排，建议关注收入、成本和现金流影响。";
  if (category === "风险预警") return "涉及安全监管或风险事件，建议及时对照企业自身车辆、驾驶员和动态监控责任。";
  if (category === "招标采购") return "涉及广东通勤班车、上下班接送或包车采购机会，建议评估线路半径、车辆配置、报价边界和履约风险。";
  if (score >= 78) return "经营影响评分较高，建议纳入今日重点跟踪。";
  return "与道路客运经营相关，可作为行业动态持续观察。";
}

export function articleId(url, title) {
  return crypto.createHash("sha1").update(`${url || ""}|${title || ""}`).digest("hex").slice(0, 16);
}

export function clusterIdFor(title) {
  const normalized = String(title || "")
    .replace(/[^\p{Script=Han}a-zA-Z0-9]/gu, "")
    .replace(/(关于|发布|通知|公告|开展|推进|加快|工作|实施|方案|道路|客运|交通运输|有限公司|集团)/g, "")
    .slice(0, 24);
  return crypto.createHash("sha1").update(normalized || title || "cluster").digest("hex").slice(0, 12);
}

export function titleSimilarity(a, b) {
  const tokens = (value) => new Set(String(value || "").replace(/[^\p{Script=Han}a-zA-Z0-9]/gu, "").split(""));
  const setA = tokens(a);
  const setB = tokens(b);
  if (!setA.size || !setB.size) return 0;
  let same = 0;
  for (const token of setA) if (setB.has(token)) same += 1;
  return same / Math.max(setA.size, setB.size);
}

export function enrichCandidate(candidate, source, aiResult = null) {
  const categoryInfo = classify(candidate);
  const category = aiResult?.category && categories.includes(aiResult.category) ? aiResult.category : categoryInfo.category;
  const dimensions = sanitizeDimensions(aiResult?.dimensions) || fallbackDimensions(candidate, source);
  const score = finalScore(dimensions, source, category);
  const threshold = sourceThreshold(source?.tier, category);
  const tags = Array.isArray(aiResult?.tags) && aiResult.tags.length ? aiResult.tags.slice(0, 6) : categoryInfo.tags;
  return {
    id: articleId(candidate.url, candidate.title),
    clusterId: clusterIdFor(candidate.title),
    title: candidate.title,
    sourceId: source.id,
    sourceName: source.name,
    sourceTier: source.tier,
    sourceType: source.type,
    region: source.region || candidate.region || "全国",
    url: candidate.url,
    publishedAt: candidate.publishedAt || new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    category,
    summary: aiResult?.summary || shortSummary(candidate),
    reason: aiResult?.reason || recommendation(category, score),
    tags: tags.length ? tags : [category],
    dimensions,
    score,
    featured: score >= threshold,
  };
}

export function recalibrateArticleScore(article) {
  if (!article?.dimensions) return article;
  const source = { tier: article.sourceTier };
  const score = finalScore(article.dimensions, source, article.category);
  return {
    ...article,
    score,
    featured: score >= sourceThreshold(article.sourceTier, article.category),
  };
}

function sanitizeDimensions(value) {
  if (!value || typeof value !== "object") return null;
  const keys = ["policyImpact", "businessValue", "riskLevel", "timeliness", "sourceAuthority"];
  const result = {};
  for (const key of keys) {
    const number = Number(value[key]);
    if (!Number.isFinite(number)) return null;
    result[key] = Math.max(0, Math.min(100, Math.round(number)));
  }
  return result;
}

export function mergeArticles(existingArticles, incomingArticles, maxArticles = 300) {
  const byId = new Map(existingArticles.map((article) => [article.id, article]));
  for (const article of incomingArticles) {
    if (!byId.has(article.id)) {
      const similar = [...byId.values()].find((item) => titleSimilarity(item.title, article.title) >= 0.55);
      if (similar) article.clusterId = similar.clusterId;
      byId.set(article.id, article);
    }
  }
  return [...byId.values()]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, maxArticles);
}

export function buildClusters(articles) {
  const groups = new Map();
  for (const article of articles) {
    const group = groups.get(article.clusterId) || [];
    group.push(article);
    groups.set(article.clusterId, group);
  }
  return [...groups.entries()].map(([clusterId, items]) => {
    const sorted = [...items].sort((a, b) => sourceRank(b) - sourceRank(a) || b.score - a.score);
    return {
      id: clusterId,
      masterId: sorted[0].id,
      count: sorted.length,
      relatedIds: sorted.slice(1).map((item) => item.id),
    };
  });
}

function sourceRank(article) {
  const tier = article.sourceTier === "T1" ? 3 : article.sourceTier === "T1.5" ? 2 : 1;
  return tier * 100 + article.score;
}
