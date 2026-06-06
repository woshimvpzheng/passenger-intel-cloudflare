import { jsonResponse, legacyHandler } from "./_lib/http.mjs";

export default async function aiStressDisabled() {
  return jsonResponse({ ok: false, message: "AI stress endpoint disabled" }, 410);
}

export const handler = legacyHandler(aiStressDisabled);
