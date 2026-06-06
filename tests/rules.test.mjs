import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClusters,
  classify,
  enrichCandidate,
  isRelevantPassengerNews,
  mergeArticles,
  recalibrateArticleScore,
} from "../netlify/functions/_lib/rules.mjs";
import { extractLinks } from "../netlify/functions/_lib/fetcher.mjs";
import { normalizeState } from "../netlify/functions/_lib/storage.mjs";
import { timeValue } from "../netlify/functions/articles.mjs";

const t1Source = {
  id: "mot-news",
  name: "交通运输部",
  tier: "T1",
  type: "官方",
  region: "全国",
};

const t2Source = {
  id: "media",
  name: "行业媒体",
  tier: "T2",
  type: "行业媒体",
  region: "全国",
};

test("国外民航新闻不会进入客运情报", () => {
  assert.equal(isRelevantPassengerNews({
    title: "美国机场航班延误影响旅客出行",
    content: "美国机场航班延误，属于国外民航信息。",
    region: "国外",
  }), false);
});

test("纯铁路信息不会进入道路客运情报", () => {
  assert.equal(isRelevantPassengerNews({
    title: "铁路部门调整高铁列车运行图",
    content: "本次调整涉及多趟高铁和铁路列车。",
    region: "全国",
  }), false);
});

test("仅因来源是交通运输部不会被归入政策监管", () => {
  const category = classify({
    title: "西江鱼鸟欢",
    content: "2026-06-05 08:15 来源: 中国交通新闻网",
    sourceName: "交通运输部",
  });
  assert.equal(category.category, "区域动态");
});

test("港口水运弱相关内容不会进入道路客运情报", () => {
  assert.equal(isRelevantPassengerNews({
    title: "云南出海最近黄金港口将于年内建成",
    content: "来源: 中国水运网，港口和水运通道建设进展。",
    sourceName: "交通运输部",
    region: "云南",
  }), false);
});

test("协会分会栏目页不会进入客运情报", () => {
  assert.equal(isRelevantPassengerNews({
    title: "客运与站场分会",
    content: "客运与站场分会 城市客运分会 出租汽车与汽车租赁分会 货运与物流分会 国际道路运输分会 大件运输分会",
    sourceName: "中国道路运输协会",
    region: "全国",
  }), false);
});

test("道路客运政策能进入政策监管", () => {
  const article = enrichCandidate({
    title: "交通运输部发布道路客运安全监管通知",
    content: "通知要求各地加强道路客运、旅游包车和客运班线安全监管。",
    url: "https://example.com/policy",
  }, t1Source);
  assert.equal(article.category, "政策监管");
  assert.equal(article.featured, true);
  assert.ok(article.score >= 70);
});

test("同行经营案例能进入经营借鉴", () => {
  const article = enrichCandidate({
    title: "客运集团推进客运站转型和交旅融合经营",
    content: "企业利用客运站资源发展旅游集散、定制客运和便民服务。",
    url: "https://example.com/business",
  }, t2Source);
  assert.equal(article.category, "经营借鉴");
  assert.ok(article.reason.includes("经营"));
});

test("广东通勤班车采购能进入招标采购", () => {
  const article = enrichCandidate({
    title: "广东某单位通勤班车租赁服务采购公告",
    content: "项目采购上下班班车、员工通勤接送和大巴车辆租赁服务，服务地点在广东省内。",
    region: "广东",
    url: "https://example.com/tender/detail.html",
  }, {
    id: "gd-gov-purchase",
    name: "广东省政府采购网",
    tier: "T1.5",
    type: "招标采购",
    region: "广东",
  });
  assert.equal(article.category, "招标采购");
  assert.equal(article.featured, true);
  assert.ok(article.score >= 70);
});

test("抓取链接时跳过首页并保留详情页", () => {
  const links = extractLinks(`
    <a href="/">广东省政府采购网首页</a>
    <a href="/notice/">采购公告列表</a>
    <span>2026-06-05</span><a href="/notice/202606/t20260605_123456.html">员工通勤班车租赁服务采购公告</a>
  `, {
    url: "https://gdgpo.czt.gd.gov.cn/",
    listUrl: "https://gdgpo.czt.gd.gov.cn/notice/",
  });
  assert.equal(links.length, 1);
  assert.equal(links[0].url, "https://gdgpo.czt.gd.gov.cn/notice/202606/t20260605_123456.html");
  assert.equal(links[0].publishedAt, "2026-06-05");
});

test("抓取链接会还原网页编码后的详情页地址", () => {
  const links = extractLinks(`
    <a href="/detail.html?id=4&amp;contentId=2229">道路客运分会工作动态</a>
  `, {
    url: "https://www.crta.org.cn/",
    listUrl: "https://www.crta.org.cn/",
  });
  assert.equal(links.length, 1);
  assert.equal(links[0].url, "https://www.crta.org.cn/detail.html?id=4&contentId=2229");
});

test("微信公众号文章链接会被识别为详情页", () => {
  const links = extractLinks(`
    <a href="https://mp.weixin.qq.com/s?__biz=abc123&amp;mid=123&amp;idx=1&amp;sn=456">道路客运定制服务观察2026-06-05</a>
  `, {
    url: "https://weixin.sogou.com/",
    listUrl: "https://weixin.sogou.com/",
  });
  assert.equal(links.length, 1);
  assert.equal(links[0].title, "道路客运定制服务观察");
  assert.ok(links[0].url.startsWith("https://mp.weixin.qq.com/s?"));
});

test("全部动态按北京时间理解无时区发布时间", () => {
  assert.ok(timeValue("2026-06-05 08:17") < timeValue("2026-06-05T10:20:00+08:00"));
});

test("历史高分文章会按新评分规则重新校准", () => {
  const article = recalibrateArticleScore({
    sourceTier: "T1",
    category: "政策监管",
    score: 95,
    dimensions: {
      policyImpact: 95,
      businessValue: 95,
      riskLevel: 95,
      timeliness: 95,
      sourceAuthority: 95,
    },
  });
  assert.ok(article.score < 95);
});

test("高经营价值招标信息校准后仍保持精选", () => {
  const article = recalibrateArticleScore({
    sourceTier: "T1.5",
    category: "招标采购",
    title: "生产人员通勤班车租赁服务项目结果公告2026-06-05",
    score: 82,
    dimensions: {
      policyImpact: 42,
      businessValue: 88,
      riskLevel: 34,
      timeliness: 82,
      sourceAuthority: 78,
    },
  });
  assert.equal(article.title, "生产人员通勤班车租赁服务项目结果公告");
  assert.ok(article.score >= 70);
  assert.equal(article.featured, true);
});

test("缓存读取时过滤只有首页链接的旧信息", () => {
  const state = normalizeState({
    articles: [
      { id: "home", url: "https://www.mot.gov.cn/" },
      { id: "detail", title: "道路客运班线恢复运营通知", content: "道路客运班线恢复运营", region: "全国", url: "https://www.mot.gov.cn/jiaotongyaowen/202601/t20260104_4195714.html" },
    ],
  });
  assert.deepEqual(state.articles.map((item) => item.id), ["detail"]);
});

test("相似标题能聚类为同一事件", () => {
  const a = enrichCandidate({
    title: "某市客运班线恢复运营并优化发车班次",
    content: "某市道路客运班线恢复运营。",
    url: "https://example.com/a",
  }, t1Source);
  const b = enrichCandidate({
    title: "某市多条客运班线恢复运营",
    content: "当地多条道路客运班线恢复。",
    url: "https://example.com/b",
  }, t2Source);
  const merged = mergeArticles([a], [b], 20);
  const clusters = buildClusters(merged);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].count, 2);
});
