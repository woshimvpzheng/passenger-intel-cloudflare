import { normalizeText, isRelevantPassengerNews } from "./rules.mjs";
import { env } from "./env.mjs";

const MAX_LINKS_PER_SOURCE = Number(env("MAX_LINKS_PER_SOURCE", "6"));
const REQUEST_TIMEOUT_MS = Number(env("REQUEST_TIMEOUT_MS", "8000"));

export async function fetchSourceCandidates(source) {
  if (source.fetchType === "wechatSearch") return fetchWechatSearchCandidates(source);
  const html = await fetchText(source.listUrl || source.url);
  const links = extractLinks(html, source).slice(0, MAX_LINKS_PER_SOURCE);
  const candidates = [];
  for (const link of links) {
    const candidate = {
      title: link.title,
      url: link.url,
      sourceName: source.name,
      region: source.region,
      content: link.title,
      publishedAt: link.publishedAt || new Date().toISOString(),
    };
    if (!isRelevantPassengerNews(candidate)) continue;
    try {
      const articleHtml = await fetchText(link.url);
      candidate.content = extractArticleText(articleHtml) || link.title;
      candidate.publishedAt = extractPublishedAt(articleHtml) || candidate.publishedAt;
    } catch {
      candidate.content = link.title;
    }
    if (isRelevantPassengerNews(candidate)) candidates.push(candidate);
  }
  return candidates;
}

async function fetchWechatSearchCandidates(source) {
  const keywords = source.keywords || ["客运", "道路客运", "定制客运", "客运站", "班线", "包车"];
  const accountName = source.wechatName || source.name;
  const query = encodeURIComponent(`${accountName} ${keywords.slice(0, 4).join(" OR ")}`);
  const html = await fetchText(source.listUrl || `https://weixin.sogou.com/weixin?type=2&query=${query}`);
  return extractWechatLinks(html, source).slice(0, MAX_LINKS_PER_SOURCE).map((link) => ({
    title: link.title,
    url: link.url,
    sourceName: source.name,
    region: source.region,
    content: `${link.title} ${source.name} ${keywords.join(" ")}`,
    publishedAt: link.publishedAt || new Date().toISOString(),
  })).filter(isRelevantPassengerNews);
}

export async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "PassengerIntelligenceBot/2.0 (+https://netlify.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`抓取失败 ${response.status}: ${url}`);
  const buffer = await response.arrayBuffer();
  const charset = charsetFromHeaders(response.headers.get("content-type")) || charsetFromHtml(buffer) || "utf-8";
  return new TextDecoder(charset, { fatal: false }).decode(buffer);
}

function charsetFromHeaders(contentType = "") {
  const match = contentType.match(/charset=([^;]+)/i);
  return normalizeCharset(match?.[1]);
}

function charsetFromHtml(buffer) {
  const start = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 1600));
  const match = start.match(/charset=["']?([a-z0-9_-]+)/i);
  return normalizeCharset(match?.[1]);
}

function normalizeCharset(value = "") {
  const lowered = String(value).trim().toLowerCase();
  if (!lowered) return "";
  if (["gbk", "gb2312", "gb18030"].includes(lowered)) return "gb18030";
  return lowered;
}

export function extractLinks(html, source) {
  const base = source.listUrl || source.url;
  const links = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html))) {
    const href = decodeHtmlAttribute(match[1]);
    const title = cleanTitle(normalizeText(match[2]).replace(/\s+/g, ""));
    if (!title || title.length < 6 || title.length > 80) continue;
    const url = absolutizeUrl(href, base);
    if (!url || !/^https?:\/\//.test(url)) continue;
    if (!isDetailUrl(url, source)) continue;
    if (links.some((item) => item.url === url || item.title === title)) continue;
    links.push({ title, url, publishedAt: extractNearbyDate(html, match.index) });
  }
  return links;
}

function extractWechatLinks(html, source) {
  const links = extractLinks(html, { ...source, url: "https://weixin.sogou.com/", listUrl: source.listUrl || "https://weixin.sogou.com/" });
  return links.filter((item) => {
    try {
      const url = new URL(item.url);
      return url.hostname === "mp.weixin.qq.com" || item.url.includes("mp.weixin.qq.com");
    } catch {
      return false;
    }
  });
}

function cleanTitle(value = "") {
  return String(value)
    .replace(/\s+/g, "")
    .replace(/20\d{2}[-/年]\d{1,2}[-/月]\d{1,2}(?:日)?$/, "")
    .trim();
}

function absolutizeUrl(href, base) {
  if (!href || /^(javascript:|mailto:|tel:|#)/i.test(href.trim())) return "";
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function decodeHtmlAttribute(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isDetailUrl(url, source) {
  try {
    const target = new URL(url);
    const home = new URL(source.url);
    const list = new URL(source.listUrl || source.url);
    const normalizedPath = target.pathname.replace(/\/+$/, "");
    if (target.hostname === "mp.weixin.qq.com" && normalizedPath === "/s" && target.search.length > 8) return true;
    if (!normalizedPath || normalizedPath === home.pathname.replace(/\/+$/, "") || normalizedPath === list.pathname.replace(/\/+$/, "")) return false;
    if (target.origin === home.origin && [home.pathname, list.pathname].map((item) => item.replace(/\/+$/, "") || "/").includes(normalizedPath || "/")) return false;
    if (/\.(jpg|jpeg|png|gif|svg|css|js|zip|rar)$/i.test(target.pathname)) return false;
    if (/\.(html|shtml|jhtml|htm|pdf)$/i.test(target.pathname)) return true;
    if (/[?&](id|article|notice|info|content|project|guid|uuid)=/i.test(target.search)) return true;
    return target.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function extractNearbyDate(html, index) {
  const chunk = html.slice(Math.max(0, index - 180), Math.min(html.length, index + 220));
  const text = normalizeText(chunk);
  const match = text.match(/20\d{2}[-/年]\d{1,2}[-/月]\d{1,2}/);
  return match ? match[0].replace("年", "-").replace("月", "-").replace("日", "").replaceAll("/", "-") : "";
}

export function extractArticleText(html) {
  const mainMatch =
    html.match(/<article[\s\S]*?<\/article>/i) ||
    html.match(/<div[^>]+class=["'][^"']*(?:TRS_Editor|article|content|main|detail)[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  const raw = mainMatch ? mainMatch[0] : html;
  return normalizeText(raw).slice(0, 2400);
}

export function extractPublishedAt(html) {
  const text = normalizeText(html);
  const match = text.match(/(20\d{2}[-年/]\d{1,2}[-月/]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/);
  if (!match) return "";
  return match[1].replace("年", "-").replace("月", "-").replace("日", "").replaceAll("/", "-");
}
