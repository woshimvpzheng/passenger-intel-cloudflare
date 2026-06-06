import { categories } from "./rules.mjs";
import { env } from "./env.mjs";

const defaultBaseUrls = {
  glm: "https://open.bigmodel.cn/api/paas/v4",
  deepseek: "https://api.deepseek.com",
};

export function aiConfigured() {
  return Boolean(env("AI_API_KEY"));
}

export async function analyzeWithAI(candidate, source) {
  if (!aiConfigured()) return null;
  const provider = env("AI_PROVIDER", "glm");
  const baseUrl = (env("AI_BASE_URL") || defaultBaseUrls[provider] || "").replace(/\/$/, "");
  const model = env("AI_MODEL", provider === "glm" ? "glm-4.7" : "");
  if (!baseUrl || !model) return null;

  const prompt = [
    "你是中国道路客运行业情报分析助手。",
    "只根据给定信息输出 JSON，不要输出解释文字。",
    "字段：summary, reason, category, tags, dimensions。",
    `category 必须从这些选：${categories.join("、")}。`,
    "dimensions 五个分值必须是 0-100 的整数：policyImpact, businessValue, riskLevel, timeliness, sourceAuthority。",
    "不要编造原文没有的数字、政策名称或企业行为。",
    "",
    `信源：${source.name}，等级：${source.tier}，地区：${source.region}`,
    `标题：${candidate.title}`,
    `正文：${String(candidate.content || candidate.title).slice(0, 1800)}`,
  ].join("\n");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env("AI_API_KEY")}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "你只输出合法 JSON。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    throw new Error(`AI 接口返回 ${response.status}`);
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return parseJson(text);
}

function parseJson(text) {
  const raw = String(text || "").trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 180) : "",
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 220) : "",
      category: typeof parsed.category === "string" ? parsed.category : "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 6) : [],
      dimensions: parsed.dimensions,
    };
  } catch {
    return null;
  }
}
