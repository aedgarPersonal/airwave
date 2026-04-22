import type { NextRequest } from "next/server";
import { requireUser } from "@/app/lib/auth";
import {
  anthropic,
  aiConfigured,
  AI_MODEL,
  estimateCostCents,
} from "@/app/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fetch-and-clean helpers, shared shape with /api/ai/parse-sponsors. Kept
// local so that endpoint stays self-contained too.
async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AirwaveBot/1.0; +https://airwave.io)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 2_500_000) throw new Error("page_too_large");
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

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
  return text.length > 60_000 ? text.slice(0, 60_000) : text;
}

function extractMetaColours(html: string) {
  // Simple heuristic pass for obvious colour hints in meta tags and inline
  // styles. Claude will still own final colour decisions — this is a fuel.
  const colours = new Set<string>();
  const re = /#([0-9a-fA-F]{6})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    colours.add(`#${m[1].toLowerCase()}`);
    if (colours.size >= 20) break;
  }
  const theme = /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i.exec(html);
  if (theme?.[1]) colours.add(theme[1]);
  return [...colours];
}

// Full import schema — a single Claude call returns everything we need. If
// the page is thin we still return what we can and mark fields as low-
// confidence. Owner reviews and discards whatever misses.
const TOOL = {
  name: "return_import",
  description:
    "Return the full Airwave station draft parsed from the source page.",
  input_schema: {
    type: "object" as const,
    properties: {
      station: {
        type: "object",
        properties: {
          name: { type: "string" },
          tagline: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          origin: {
            type: ["string", "null"],
            description: "Short all-caps hero kicker, e.g. 'LIVE FROM THE 6IX'.",
          },
          stream_url: {
            type: ["string", "null"],
            description:
              "If you can find an HTTPS stream URL in the page (common: radioca.st, shoutca.st), return it. Null otherwise.",
          },
          status_url: {
            type: ["string", "null"],
            description:
              "If the stream host's status-json.xsl URL is discoverable from the stream URL, include it.",
          },
        },
        required: ["name"],
      },
      contact: {
        type: "object",
        properties: {
          landline: { type: ["string", "null"] },
          mobile: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          twitter: { type: ["string", "null"] },
          facebookUrl: { type: ["string", "null"] },
          instagramUrl: { type: ["string", "null"] },
        },
      },
      donate: {
        type: "object",
        properties: {
          url: { type: ["string", "null"] },
          label: { type: ["string", "null"] },
          pitch: { type: ["string", "null"] },
        },
      },
      theme: {
        type: "object",
        properties: {
          ink: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          ink2: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          cream: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          accent1: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          accent2: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          accent3: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          tone: { type: "string" },
          rationale: { type: "string" },
        },
        required: [
          "ink",
          "ink2",
          "cream",
          "accent1",
          "accent2",
          "accent3",
          "tone",
        ],
      },
      shows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: {
              type: "string",
              enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Daily"],
            },
            start_min: { type: "integer", minimum: 0, maximum: 1439 },
            end_min: { type: "integer", minimum: 0, maximum: 1439 },
            title: { type: "string" },
            host: { type: ["string", "null"] },
            crosses_midnight: { type: "boolean" },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
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
      sponsors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            link: { type: ["string", "null"] },
            accent: {
              type: "string",
              enum: ["green", "gold", "red", "sun"],
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
    required: ["station", "contact", "donate", "theme", "shows", "sponsors", "notes"],
  },
};

const SYSTEM = `You import an existing radio station's web presence into the Airwave platform. The input is scraped text from the station's current site (may be a WordPress site, a one-page Wix, a Facebook-ish blurb, or a radioca.st default listing).

Your job is to fill in as many fields as you can confidently extract. Rules:

1. Station info
   - name: short display name (e.g. "Riddim WSM", not "Riddim WSM - World Sound Music — Caribbean Internet Radio Broadcasting From Ottawa Canada 24/7").
   - tagline: one line like "Caribbean sounds from the North". Extract from hero copy if present, otherwise write one that fits the mood.
   - description: 1-3 sentences for an about section.
   - origin: all-caps hero kicker like "LIVE FROM THE 6IX TO THE WORLD". Optional.
   - stream_url: if you see a stream URL on the page (common hosts: radioca.st, shoutca.st, zeno.fm), extract it. Prefer HTTPS.
   - status_url: derive from stream_url if host uses standard Icecast status-json.xsl.

2. Contact: only return fields you can read from the page. Never invent phone numbers or emails. Phone numbers should keep their formatting.

3. Donate: return ONLY if there's an obvious donate/support link (Ko-fi, PayPal, Patreon, Stripe, CanadaHelps). Otherwise leave url null and everything else follows.

4. Theme: derive from page colours (CSS hex values, theme-color meta, obvious brand cues) + the station's genre/culture. Six hex values, all distinct. ink and ink2 are backgrounds (dark), cream is text (near-white). Accent1/2/3 are brand colours. Must pass WCAG AA contrast for cream on ink.

5. Shows: parse any schedule you find. Normalise days to 3-letter abbreviations. Convert times to minutes since midnight. For overnight shows (e.g. 10PM-2AM), set crosses_midnight=true with end_min being the early-morning time.

6. Sponsors: parse any sponsor / partners / community section on the page. Only include clear businesses; skip navigation / social / legal.

7. Notes: short lines for the station owner about anything ambiguous, missing, or assumed.

8. Never invent facts. If the page doesn't mention it, leave the field null or empty. Call return_import exactly once.`;

export async function POST(req: NextRequest) {
  await requireUser();
  if (!aiConfigured()) {
    return Response.json(
      { error: "ai_not_configured", hint: "Set ANTHROPIC_API_KEY in Vercel." },
      { status: 500 },
    );
  }

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) {
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

  let html: string;
  let text: string;
  try {
    html = await fetchText(parsed.toString());
    text = extractVisible(html);
    if (text.length < 200) {
      return Response.json(
        {
          error: "page_too_empty",
          hint: "The page didn't return meaningful text — it may be a JavaScript-rendered SPA. Try adding a blog/about page instead of the homepage, or fall back to manual setup.",
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

  const colourHints = extractMetaColours(html).slice(0, 12);

  try {
    const client = anthropic();
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "return_import" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Extract an Airwave station draft from this page.\n\n` +
                `SOURCE URL: ${parsed.toString()}\n` +
                (colourHints.length
                  ? `COLOUR HINTS (CSS hex values found in the page): ${colourHints.join(", ")}\n`
                  : "") +
                `\n---PAGE TEXT---\n${text}`,
            },
          ],
        },
      ],
    });

    const tool = res.content.find((b) => b.type === "tool_use");
    if (!tool || tool.type !== "tool_use") {
      return Response.json({ error: "no_tool_output" }, { status: 502 });
    }
    const cost = estimateCostCents(res.usage);
    // We don't log to ai_generations yet — this runs before a station exists.
    return Response.json({
      source_url: parsed.toString(),
      ...(tool.input as Record<string, unknown>),
      cost_cents: cost,
    });
  } catch (e) {
    return Response.json(
      { error: "ai_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
