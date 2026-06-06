import { buildBriefing } from "./_lib/briefing.mjs";
import { jsonResponse, legacyHandler } from "./_lib/http.mjs";
import { readState } from "./_lib/storage.mjs";

export default async function briefing() {
  const state = await readState();
  const briefing = buildBriefing(state.articles);
  return jsonResponse({ ok: true, briefing });
}

export const config = { path: "/api/briefing" };
export const handler = legacyHandler(briefing);
