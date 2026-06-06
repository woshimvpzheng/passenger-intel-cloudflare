import test from "node:test";
import assert from "node:assert/strict";
import { handler as articlesHandler } from "../netlify/functions/articles.mjs";
import { handler as briefingHandler } from "../netlify/functions/briefing.mjs";
import { handler as sourcesHandler } from "../netlify/functions/sources.mjs";
import { handler as statusHandler } from "../netlify/functions/status.mjs";

test("articles function returns cached articles", async () => {
  const response = await articlesHandler({ httpMethod: "GET", queryStringParameters: { tab: "全部动态" } });
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.ok, true);
  assert.ok(body.articles.length >= 1);
});

test("briefing function returns briefing", async () => {
  const response = await briefingHandler({ httpMethod: "GET", queryStringParameters: {} });
  const body = JSON.parse(response.body);
  assert.equal(body.ok, true);
  assert.ok(body.briefing.headline);
});

test("sources and status functions return configuration", async () => {
  const sources = JSON.parse((await sourcesHandler({})).body);
  const status = JSON.parse((await statusHandler({})).body);
  assert.ok(sources.sources.length >= 8);
  assert.equal(status.ok, true);
  assert.ok(status.status.schedule.includes("北京时间"));
});

