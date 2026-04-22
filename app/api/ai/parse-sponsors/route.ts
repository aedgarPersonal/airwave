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

const TOOL = {
  name: "return_sponsors",
  description:
    "Return the parsed list of businesses / sponsors extracted from the page.",
  input_schema: {
    type: "object" as const,
    properties: {
      sponsors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Business name as it appears on the page.",
            },
            category: {
              type: ["string", "null"],
              description:
                "Short category description, e.g. 'Jamaican restaurant', 'Afro-Caribbean grocery'. Null if unclear.",
            },
            location: {
              type: ["string", "null"],
              description:
                "Street address or neighbourhood. Null if not present on the page.",
            },
            link: {
              type: ["string", "null"],
              description:
                "Absolute URL if the page links to the business's own site. Null if no link is available — do NOT invent URLs.",
            },
            accent: {
              type: "string",
              enum: ["green", "gold", "red", "sun"],
              description:
                "Suggested accent colour for the card. Pick something that roughly fits the business category; balance the four across the set.",
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
          required: ["name", "accent", "confidence"],
        },
      },
      notes: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["sponsors", "notes"],
  },
};

const SYSTEM = `You extract local-business / sponsor / partner listings from a web page. The input is the visible text and link anchors scraped from a page the station owner pointed us at.

Rules:
- Only include entries that are clearly businesses, sponsors, or community partners the station is featuring. Skip navigation items, footer links, legal pages, social-media icons, and the station's own pages.
- Preserve exact name spelling and any provided address.
- Only set "link" when the input text contains a corresponding URL that clearly belongs to the business. Never invent or guess URLs.
- Balance accent colours roughly across the four options.
- If the page is empty, looks like a SPA that didn't render its content, or is blocked, return an empty list and explain in notes.
- Do NOT output prose. Only call return_sponsors.`;

// Very small safety wrapper around fetch. Enforces a timeout + size cap so a
// malicious or poorly-sized page can't eat the function.
async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      // Some sites serve different content to bots. Identify as a recognisable
      // browser UA so we get the public-facing HTML.
      "User-Agent":
        "Mozilla/5.0 (compatible; AirwaveBot/1.0; +https://airwave.io)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 2_000_000) {
    throw new Error("page_too_large");
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

// Strip scripts/styles and normalise whitespace; keep anchor text + href on
// one line so Claude can associate names with URLs.
function extractVisible(html: string) {
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const noStyles = noScripts.replace(/<style[\s\S]*?<\/style>/gi, "");
  const withLinks = noStyles.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href, inner) => ` [${inner.replace(/<[^>]+>/g, "").trim()}](${href}) `,
  );
  const text = withLinks
    .replace(/<\/?(p|div|li|br|h[1-6]|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  return text.length > 40_000 ? text.slice(0, 40_000) : text;
}

export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (!aiConfigured()) {
    return Response.json(
      { error: "ai_not_configured", hint: "Set ANTHROPIC_API_KEY" },
      { status: 500 },
    );
  }
  const { slug, url, hint } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    url?: string;
    hint?: string;
  };
  if (!slug || !url) {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: "invalid_url" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return Response.json({ error: "unsupported_protocol" }, { status: 400 });
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
  const limit = await checkRateLimit(station.id, "parse_sponsors");
  if (!limit.ok) {
    return Response.json(
      { error: "rate_limited", limit: limit.limit, remaining: 0 },
      { status: 429 },
    );
  }

  let pageText: string;
  try {
    const html = await fetchText(parsed.toString());
    pageText = extractVisible(html);
    if (pageText.length < 200) {
      return Response.json(
        {
          error: "page_too_empty",
          hint: "The page didn't return much text — it may be a JavaScript-rendered SPA. Try pasting the sponsor list as plain text instead.",
        },
        { status: 422 },
      );
    }
  } catch (e) {
    return Response.json(
      { error: "fetch_failed", detail: String(e) },
      { status: 502 },
    );
  }

  try {
    const client = anthropic();
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "return_sponsors" },
      messages: [
        {
          role: "user",
          content:
            `Extract sponsors from this page:\n\nSOURCE URL: ${parsed.toString()}\n` +
            (hint ? `HINT: ${hint}\n` : "") +
            `\n---PAGE TEXT---\n${pageText}`,
        },
      ],
    });
    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return Response.json({ error: "no_tool_output" }, { status: 502 });
    }
    const input = toolUse.input as {
      sponsors: Array<{
        name: string;
        category: string | null;
        location: string | null;
        link: string | null;
        accent: "green" | "gold" | "red" | "sun";
        confidence: "high" | "medium" | "low";
      }>;
      notes: string[];
    };

    const cost = estimateCostCents(res.usage);
    await recordGeneration(station.id, "parse_sponsors", cost);

    return Response.json({
      sponsors: input.sponsors,
      notes: input.notes,
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
