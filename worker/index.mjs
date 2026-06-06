import articles from "../netlify/functions/articles.mjs";
import briefing from "../netlify/functions/briefing.mjs";
import sources from "../netlify/functions/sources.mjs";
import status from "../netlify/functions/status.mjs";
import { jsonResponse } from "../netlify/functions/_lib/http.mjs";
import { refreshPipeline } from "../netlify/functions/_lib/pipeline.mjs";
import sourcesData from "../data/sources.json" with { type: "json" };
import sampleState from "../data/sample-state.json" with { type: "json" };

function bindRuntime(env) {
  globalThis.__CF_ENV__ = env;
  globalThis.__CF_SOURCES__ = sourcesData;
  globalThis.__CF_SAMPLE_STATE__ = sampleState;
}

async function saveFeedback(request, env) {
  const payload = await request.json().catch(() => null);
  if (!payload?.message || String(payload.message).trim().length < 2) {
    return jsonResponse({ ok: false, message: "请填写反馈内容。" }, 400);
  }
  const item = {
    id: `feedback-${Date.now()}`,
    type: String(payload.type || "反馈"),
    name: String(payload.name || "").slice(0, 80),
    contact: String(payload.contact || "").slice(0, 120),
    message: String(payload.message || "").slice(0, 2000),
    createdAt: new Date().toISOString(),
  };
  const key = "feedback.json";
  const existing = await env.PASSENGER_STATE.get(key, { type: "json" }).catch(() => null);
  const list = Array.isArray(existing) ? existing : [];
  await env.PASSENGER_STATE.put(key, JSON.stringify([item, ...list].slice(0, 200)));
  return jsonResponse({ ok: true, message: "已提交，感谢反馈。" });
}

async function routeApi(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/articles" || url.pathname === "/.netlify/functions/articles") return articles(request);
  if (url.pathname === "/api/briefing" || url.pathname === "/.netlify/functions/briefing") return briefing(request);
  if (url.pathname === "/api/sources" || url.pathname === "/.netlify/functions/sources") return sources(request);
  if (url.pathname === "/api/status" || url.pathname === "/.netlify/functions/status") return status(request);
  if (url.pathname === "/api/feedback" && request.method === "POST") return saveFeedback(request, env);
  if (url.pathname === "/api/refresh" || url.pathname === "/.netlify/functions/refresh") {
    if (request.method !== "POST") return jsonResponse({ ok: false, message: "请使用 POST 触发后台刷新。" }, 405);
    return jsonResponse(await refreshPipeline("manual"));
  }
  return null;
}

export default {
  async fetch(request, env) {
    bindRuntime(env);
    const apiResponse = await routeApi(request, env);
    if (apiResponse) return apiResponse;
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    bindRuntime(env);
    ctx.waitUntil(refreshPipeline("scheduled"));
  },
};
