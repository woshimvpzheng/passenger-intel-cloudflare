import { buildBriefing } from "./_lib/briefing.mjs";
import { jsonResponse, legacyHandler } from "./_lib/http.mjs";
import { readState, writeState } from "./_lib/storage.mjs";
import { beijingDateKey } from "./_lib/time.mjs";

export default async function briefing() {
  const state = await readState();
  let briefing = state.briefing;
  const staleSections = briefing?.sections?.length === 0 && state.articles.some((item) => item.featured);
  if (!briefing || briefing.date !== beijingDateKey() || staleSections) {
    briefing = buildBriefing(state.articles);
    await writeState({ ...state, briefing });
  }
  return jsonResponse({ ok: true, briefing });
}

export const config = { path: "/api/briefing" };
export const handler = legacyHandler(briefing);
