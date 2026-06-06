import fs from "node:fs/promises";
import path from "node:path";
import { isCloudflare, isNetlify, isServerlessRuntime } from "./env.mjs";

const root = globalThis.process?.cwd?.() || "F:/制作自动捕捉网站";
const localDir = path.join(root, ".netlify-local");
const localStatePath = path.join(localDir, "passenger-state.json");
const samplePath = path.join(root, "data", "sample-state.json");
const storeName = "passenger-intelligence";
const stateKey = "state.json";

async function sampleState() {
  if (globalThis.__CF_SAMPLE_STATE__) return structuredClone(globalThis.__CF_SAMPLE_STATE__);
  const raw = await fs.readFile(samplePath, "utf8");
  return JSON.parse(raw);
}

function getKvStore() {
  return globalThis.__CF_ENV__?.PASSENGER_STATE || null;
}

async function getBlobStore() {
  if (!isNetlify()) return null;
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore(storeName);
  } catch {
    return null;
  }
}

function canWriteLocalCache() {
  return !isNetlify() && !isServerlessRuntime();
}

async function readLocalState() {
  try {
    const raw = await fs.readFile(localStatePath, "utf8");
    return JSON.parse(raw);
  } catch {
    const initial = await sampleState();
    if (canWriteLocalCache()) await writeLocalState(initial);
    return initial;
  }
}

async function writeLocalState(state) {
  await fs.mkdir(localDir, { recursive: true });
  await fs.writeFile(localStatePath, JSON.stringify(state, null, 2), "utf8");
}

export async function readState() {
  const kv = getKvStore();
  if (kv) {
    const state = await kv.get(stateKey, { type: "json" });
    if (state) return normalizeState(state);
    const initial = normalizeState(await sampleState());
    await kv.put(stateKey, JSON.stringify(initial));
    return initial;
  }
  const store = await getBlobStore();
  if (store) {
    const state = await store.get(stateKey, { type: "json" });
    if (state) return normalizeState(state);
    const initial = await sampleState();
    await store.setJSON(stateKey, initial);
    return normalizeState(initial);
  }
  if (!canWriteLocalCache()) return normalizeState(await sampleState());
  return readLocalState();
}

export async function writeState(state) {
  const normalized = normalizeState(state);
  const kv = getKvStore();
  if (kv) {
    await kv.put(stateKey, JSON.stringify(normalized));
    return normalized;
  }
  const store = await getBlobStore();
  if (store) {
    await store.setJSON(stateKey, normalized);
    return normalized;
  }
  if (!canWriteLocalCache()) return normalized;
  await writeLocalState(normalized);
  return normalized;
}

export function normalizeState(state = {}) {
  return {
    articles: Array.isArray(state.articles) ? state.articles.filter((article) => isArticleDetailUrl(article?.url)) : [],
    clusters: Array.isArray(state.clusters) ? state.clusters : [],
    briefing: state.briefing || null,
    logs: Array.isArray(state.logs) ? state.logs : [],
    cursor: Number.isInteger(state.cursor) ? state.cursor : 0,
  };
}

export function isArticleDetailUrl(value = "") {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts.at(-1) || "";
    if (!parts.length) return false;
    if (/^(index|default|home)\.(html?|shtml|jhtml)$/i.test(last) && parts.length <= 2) return false;
    if (/\.(html|shtml|jhtml|htm|pdf)$/i.test(last)) return true;
    if (/[?&](id|article|notice|info|content|project|guid|uuid|contentId)=/i.test(url.search)) return true;
    return parts.length >= 3 && !/^(list|news|zhengce|index)$/i.test(last);
  } catch {
    return false;
  }
}
