import fs from "node:fs/promises";
import path from "node:path";

const root = globalThis.process?.cwd?.() || "F:/制作自动捕捉网站";
const sourcePath = path.join(root, "data", "sources.json");

export async function loadSources() {
  if (Array.isArray(globalThis.__CF_SOURCES__)) {
    return globalThis.__CF_SOURCES__.filter((source) => source.enabled !== false);
  }
  const raw = await fs.readFile(sourcePath, "utf8");
  return JSON.parse(raw).filter((source) => source.enabled !== false);
}

export function sourceWeight(tier) {
  if (tier === "T1") return 1.22;
  if (tier === "T1.5") return 1.08;
  return 0.92;
}

export function sourceThreshold(tier, category) {
  if (category === "风险预警") return 72;
  if (category === "招标采购") return 70;
  if (tier === "T1") return 66;
  if (tier === "T1.5") return 72;
  return 78;
}

export function pickSourceBatch(sources, cursor = 0, batchSize = 4) {
  if (!sources.length) return { batch: [], nextCursor: 0 };
  const sorted = [...sources].sort((a, b) => b.priority - a.priority);
  const batch = [];
  for (let i = 0; i < Math.min(batchSize, sorted.length); i += 1) {
    batch.push(sorted[(cursor + i) % sorted.length]);
  }
  return { batch, nextCursor: (cursor + batch.length) % sorted.length };
}
