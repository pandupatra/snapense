// Gemini API cost tracker — logs per-call and cumulative spend to console.
// Pricing is approximate and may vary by region / model version.

interface GeminiPricing {
  inputPer1M: number; // USD
  outputPer1M: number; // USD
}

const PRICING: Record<string, GeminiPricing> = {
  "gemini-2.0-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-2.0-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-flash-8b": { inputPer1M: 0.0375, outputPer1M: 0.15 },
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
};

let cumulativeCalls = 0;
let cumulativeInputTokens = 0;
let cumulativeOutputTokens = 0;
let cumulativeCostUSD = 0;

function getPricing(model: string): GeminiPricing {
  // Try exact match first, then prefix match
  if (PRICING[model]) return PRICING[model];
  for (const key of Object.keys(PRICING)) {
    if (model.startsWith(key)) return PRICING[key];
  }
  // Default to flash-lite pricing
  return PRICING["gemini-2.0-flash-lite"];
}

export interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export function logGeminiCost(
  model: string,
  usage: UsageMetadata | undefined,
): void {
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  const totalTokens = usage?.totalTokenCount ?? inputTokens + outputTokens;

  const pricing = getPricing(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  const callCost = inputCost + outputCost;

  cumulativeCalls += 1;
  cumulativeInputTokens += inputTokens;
  cumulativeOutputTokens += outputTokens;
  cumulativeCostUSD += callCost;

  console.log("[Gemini Cost] ────────────────────────────────");
  console.log(`[Gemini Cost] Model:        ${model}`);
  console.log(`[Gemini Cost] Input tokens:  ${inputTokens.toLocaleString()}`);
  console.log(`[Gemini Cost] Output tokens: ${outputTokens.toLocaleString()}`);
  console.log(`[Gemini Cost] Total tokens:  ${totalTokens.toLocaleString()}`);
  console.log(`[Gemini Cost] Call cost:    ~$${callCost.toFixed(6)} USD`);
  console.log(`[Gemini Cost] Cumulative:   ~$${cumulativeCostUSD.toFixed(6)} USD (${cumulativeCalls} calls)`);
  console.log("[Gemini Cost] ────────────────────────────────");
}

export function getGeminiCumulativeStats() {
  return {
    calls: cumulativeCalls,
    inputTokens: cumulativeInputTokens,
    outputTokens: cumulativeOutputTokens,
    costUSD: cumulativeCostUSD,
  };
}