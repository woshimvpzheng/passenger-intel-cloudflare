import { jsonResponse, legacyHandler } from "./_lib/http.mjs";
import { readState } from "./_lib/storage.mjs";
import { loadSources } from "./_lib/sources.mjs";
import { aiConfigured } from "./_lib/ai.mjs";
import { isCloudflare, isNetlify } from "./_lib/env.mjs";

export default async function status() {
  const state = await readState();
  const sources = await loadSources();
  const latestLog = state.logs[0] || null;
  return jsonResponse({
    ok: true,
    status: {
      articles: state.articles.length,
      featured: state.articles.filter((item) => item.featured).length,
      clusters: state.clusters.length,
      sources: sources.length,
      latestLog,
      aiConfigured: aiConfigured(),
      storage: isCloudflare() ? "Cloudflare KV" : isNetlify() ? "Netlify Blobs" : "本地预览缓存",
      schedule: "北京时间 7:00、9:00、11:00、13:00、15:00、17:00",
    },
  });
}

export const config = { path: "/api/status" };
export const handler = legacyHandler(status);
