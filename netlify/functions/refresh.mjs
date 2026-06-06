import { jsonResponse, legacyHandler } from "./_lib/http.mjs";
import { refreshPipeline } from "./_lib/pipeline.mjs";

export default async function refresh(request) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "请使用 POST 触发后台刷新。" }, 405);
  }
  const result = await refreshPipeline("manual");
  return jsonResponse(result);
}

export const config = { path: "/api/refresh" };
export const handler = legacyHandler(refresh);
