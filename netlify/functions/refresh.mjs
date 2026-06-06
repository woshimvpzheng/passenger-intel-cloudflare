import { jsonResponse, legacyHandler } from "./_lib/http.mjs";

export default async function refresh(request) {
  return jsonResponse({
    ok: false,
    message: "手动刷新已关闭，系统将按固定频率自动抓取。",
  }, 410);
}

export const config = { path: "/api/refresh" };
export const handler = legacyHandler(refresh);
