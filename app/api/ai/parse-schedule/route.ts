import type { NextRequest } from "next/server";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";
import {
  anthropic,
  aiConfigured,
  AI_MODEL,
  recordGeneration,
  checkRateLimit,
  estimateCostCents,
} from "@/app/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tool schema that matches the Show type. The AI is forced to emit data in
// this shape, which lets us validate + preview + save without parsing prose.
const TOOL = {
  name: "return_shows",
  description:
    "Return the parsed radio station schedule as a normalised list of shows.",
  input_schema: {
    type: "object" as const,
    properties: {
      shows: {
        type: "array",
        description:
          "One entry per distinct show slot. Deduplicate if the input repeats.",
        items: {
          type: "object",
          properties: {
            day: {
              type: "string",
              enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Daily"],
              description:
                "Three-letter weekday abbreviation. Use 'Daily' only for shows explicitly described as daily or every day.",
            },
            start_min: {
              type: "integer",
              minimum: 0,
              maximum: 1439,
              description: "Show start time in minutes since midnight.",
            },
            end_min: {
              type: "integer",
              minimum: 0,
              maximum: 1439,
              description:
                "Show end time in minutes since midnight. For a show that ends after midnight (e.g. 10 PM – 2 AM), set end_min to the early-morning time (e.g. 120) and crosses_midnight to true.",
            },
            title: { type: "string", description: "Show / program name" },
            host: {
              type: ["string", "null"],
              description: "DJ or host name(s). Null if unspecified.",
            },
            crosses_midnight: {
              type: "boolean",
              description: "True when end time is on the next calendar day.",
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description:
                "Your confidence that this row is correct. Use 'medium' or 'low' for ambiguous time ranges, unclear day labels, or partial information.",
            },
          },
          required: [
            "day",
            "start_min",
            "end_min",
            "title",
            "crosses_midnight",
            "confidence",
          ],
        },
      },
      notes: {
        type: "array",
        items: { type: "string" },
        description:
          "Short notes about ambiguities, dropped duplicates, or assumptions you made. Shown to the station owner during review.",
      },
    },
    required: ["shows", "notes"],
  },
};

const SYSTEM = `You parse radio station schedules. The input is unstructured text copied by the station owner — it may come from a website, a Word doc, a Facebook post, or hand-written notes. Your job is to return a clean, deduplicated list of shows.

Rules:
- Normalise days to three-letter abbreviations (Sun, Mon, ..., Sat). "SUNDAY", "sundays", "SUN" → "Sun".
- Convert all times to minutes since midnight (e.g. 7 PM = 1140, 10:30 PM = 1350).
- For shows that cross midnight (e.g. "10 PM – 2 AM"): set start_min to the late time (1320), end_min to the early-morning time (120), and crosses_midnight to true.
- Deduplicate: if the same slot appears more than once, return only one.
- Preserve exact spelling of show titles and host names, including quirky capitalisation.
- If information is missing or ambiguous, flag it in confidence ("medium" or "low") and describe the ambiguity in the notes array.
- Do NOT invent shows, hosts, or times. If nothing can be parsed, return an empty list and a note explaining why.
- Do NOT output prose — only call the return_shows tool.`;

export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (!aiConfigured()) {
    return Response.json(
      { error: "ai_not_configured", hint: "Set ANTHROPIC_API_KEY in Vercel env." },
      { status: 500 },
    );
  }
  const { slug, text } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    text?: string;
  };
  if (!slug || typeof text !== "string" || text.length < 10) {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }
  if (text.length > 20_000) {
    return Response.json(
      { error: "text_too_long", max: 20_000 },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();
  const { data: station } = await sb
    .from("stations")
    .select("id, owner_user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!station || station.owner_user_id !== userId) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const limit = await checkRateLimit(station.id, "parse_schedule");
  if (!limit.ok) {
    return Response.json(
      { error: "rate_limited", limit: limit.limit, remaining: 0 },
      { status: 429 },
    );
  }

  try {
    const client = anthropic();
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "return_shows" },
      messages: [
        {
          role: "user",
          content: `Parse this schedule into shows:\n\n${text}`,
        },
      ],
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return Response.json({ error: "no_tool_output" }, { status: 502 });
    }
    const parsed = toolUse.input as {
      shows: Array<{
        day: string;
        start_min: number;
        end_min: number;
        title: string;
        host: string | null;
        crosses_midnight: boolean;
        confidence: "high" | "medium" | "low";
      }>;
      notes: string[];
    };

    const cost = estimateCostCents(res.usage);
    await recordGeneration(station.id, "parse_schedule", cost);

    return Response.json({
      shows: parsed.shows,
      notes: parsed.notes,
      rate: { remaining: Math.max(0, limit.remaining - 1), limit: limit.limit },
      cost_cents: cost,
    });
  } catch (e) {
    return Response.json(
      { error: "ai_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
