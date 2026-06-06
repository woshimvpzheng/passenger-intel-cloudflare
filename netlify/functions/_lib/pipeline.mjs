import { analyzeWithAI, aiConfigured } from "./ai.mjs";
import { buildBriefing } from "./briefing.mjs";
import { fetchSourceCandidates } from "./fetcher.mjs";
import { enrichCandidate, isRelevantPassengerNews, mergeArticles, buildClusters } from "./rules.mjs";
import { loadSources, pickSourceBatch } from "./sources.mjs";
import { readState, writeState } from "./storage.mjs";
import { nowIso } from "./time.mjs";
import { env } from "./env.mjs";

const MAX_SOURCES_PER_RUN = Number(env("MAX_SOURCES_PER_RUN", "2"));
const MAX_NEW_ARTICLES_PER_RUN = Number(env("MAX_NEW_ARTICLES_PER_RUN", "6"));
const MAX_AI_CALLS_PER_RUN = Number(env("MAX_AI_CALLS_PER_RUN", "2"));
const MAX_ARTICLES_STORED = Number(env("MAX_ARTICLES_STORED", "300"));

export async function refreshPipeline(mode = "manual") {
  const startedAt = nowIso();
  const state = await readState();
  const sources = await loadSources();
  const { batch, nextCursor } = pickSourceBatch(sources, state.cursor || 0, MAX_SOURCES_PER_RUN);
  const knownUrls = new Set(state.articles.map((article) => article.url));
  const knownIds = new Set(state.articles.map((article) => article.id));
  const incoming = [];
  const errors = [];
  let candidatesCount = 0;
  let skipped = 0;
  let aiCalls = 0;

  for (const source of batch) {
    let candidates = [];
    try {
      candidates = await fetchSourceCandidates(source);
    } catch (error) {
      errors.push(`${source.name}: ${error.message}`);
    }
    candidatesCount += candidates.length;
    for (const candidate of candidates) {
      if (incoming.length >= MAX_NEW_ARTICLES_PER_RUN) break;
      if (knownUrls.has(candidate.url)) {
        skipped += 1;
        continue;
      }
      if (!isRelevantPassengerNews(candidate)) {
        skipped += 1;
        continue;
      }
      let aiResult = null;
      if (aiConfigured() && aiCalls < MAX_AI_CALLS_PER_RUN) {
        try {
          aiResult = await analyzeWithAI(candidate, source);
          aiCalls += 1;
        } catch (error) {
          errors.push(`AI: ${error.message}`);
        }
      }
      const enriched = enrichCandidate(candidate, source, aiResult);
      if (knownIds.has(enriched.id)) {
        skipped += 1;
        continue;
      }
      incoming.push(enriched);
      knownUrls.add(enriched.url);
      knownIds.add(enriched.id);
    }
  }

  const articles = mergeArticles(state.articles, incoming, MAX_ARTICLES_STORED);
  const clusters = buildClusters(articles);
  const briefing = buildBriefing(articles);
  const log = {
    id: `log-${Date.now()}`,
    startedAt,
    finishedAt: nowIso(),
    mode,
    processedSources: batch.length,
    sourceNames: batch.map((source) => source.name),
    candidates: candidatesCount,
    newArticles: incoming.length,
    skipped,
    aiCalls,
    errors,
    message: `本次处理 ${batch.length} 个信源，候选 ${candidatesCount} 条，新增 ${incoming.length} 条，AI 调用 ${aiCalls} 次。`,
  };

  await writeState({
    articles,
    clusters,
    briefing,
    logs: [log, ...state.logs].slice(0, 50),
    cursor: nextCursor,
  });

  return { ok: true, log, articlesCount: articles.length, clustersCount: clusters.length };
}
