import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/app/lib/supabase";

// Shared Anthropic client. Callers still need to handle the missing-key case
// — an instance is always returned, but calls without a key will fail.
let _client: Anthropic | null = null;
export function anthropic() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export function aiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Default model for structured-output tasks. Claude's Sonnet tier gives
// reliable JSON tool-use output at a fraction of the cost of Opus.
export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-5-20250929";

// Record a generation in the ledger for rate-limiting and cost accounting.
// Returns cost in cents so callers can surface it if useful.
export async function recordGeneration(
  stationId: string,
  kind: string,
  costCents = 0,
) {
  const sb = supabaseAdmin();
  await sb.from("ai_generations").insert({
    station_id: stationId,
    kind,
    cost_cents: costCents,
  });
}

// Rough daily rate limit per (station, kind). Prevents a rogue client from
// burning a hundred dollars in image generations overnight. Free-tier limit;
// paid tiers can raise or remove this.
const DAILY_LIMITS: Record<string, number> = {
  parse_schedule: 40,
  parse_sponsors: 40,
  theme: 40,
  copy: 100,
  logo: 10,
  default: 50,
};

export async function checkRateLimit(
  stationId: string,
  kind: string,
): Promise<{ ok: boolean; remaining: number; limit: number }> {
  const limit = DAILY_LIMITS[kind] ?? DAILY_LIMITS.default;
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("station_id", stationId)
    .eq("kind", kind)
    .gte("created_at", since);
  const used = count ?? 0;
  return { ok: used < limit, remaining: Math.max(0, limit - used), limit };
}

// Helper: compute rough Anthropic cost from usage tokens. Current Sonnet
// pricing (as of 2026): $3/Mtok input, $15/Mtok output. Keep figures
// configurable via env when we support multiple models.
export function estimateCostCents(usage: { input_tokens?: number; output_tokens?: number }) {
  const inCost = (usage.input_tokens ?? 0) * 3 / 1_000_000;
  const outCost = (usage.output_tokens ?? 0) * 15 / 1_000_000;
  return Math.ceil((inCost + outCost) * 100);
}
