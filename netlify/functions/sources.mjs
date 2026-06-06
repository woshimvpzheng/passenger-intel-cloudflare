import { jsonResponse, legacyHandler } from "./_lib/http.mjs";
import { loadSources } from "./_lib/sources.mjs";

export default async function sources() {
  const sources = await loadSources();
  return jsonResponse({ ok: true, sources });
}

export const config = { path: "/api/sources" };
export const handler = legacyHandler(sources);
