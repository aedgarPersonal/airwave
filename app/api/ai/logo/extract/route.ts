import type { NextRequest } from "next/server";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";
import {
  anthropic,
  aiConfigured,
  AI_MODEL,
  estimateCostCents,
  recordGeneration,
} from "@/app/lib/ai";
import type { ThemeTokens } from "@/app/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = {
  name: "return_theme_from_logo",
  description:
    "Return a station theme derived from the uploaded logo image.",
  input_schema: {
    type: "object" as const,
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
      "rationale",
    ],
  },
};

const SYSTEM = `You extract a station-page colour palette from an uploaded logo. Return SIX hex colours as in the tool schema:
- ink, ink2: dark backgrounds (near-black). Bias toward #0b0f0b / #141b15 unless the logo is overwhelmingly a non-black dark shade, in which case lean into that.
- cream: off-white text colour, high contrast against ink. Typically #f6efe1 or similar; adjust warmth based on the logo's warmth.
- accent1 / accent2 / accent3: three distinct brand accents pulled from the dominant colours in the logo. Ignore pure white/grey unless they're the only colours present.

Colours must pass WCAG AA contrast for cream-on-ink. Do NOT output prose — only call return_theme_from_logo.`;

export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (!aiConfigured()) {
    return Response.json({ error: "ai_not_configured" }, { status: 503 });
  }
  const { slug, apply } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    apply?: boolean;
  };
  if (!slug) return Response.json({ error: "invalid_input" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: station } = await sb
    .from("stations")
    .select("id, owner_user_id, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!station || station.owner_user_id !== userId) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (!station.logo_url) {
    return Response.json(
      { error: "no_logo", hint: "Upload a logo first." },
      { status: 400 },
    );
  }

  // Fetch the logo bytes. Claude's vision expects base64; we fetch ourselves
  // so the request stays under the Anthropic 5MB image limit.
  let mediaType = "image/png";
  let base64: string;
  try {
    const imgRes = await fetch(station.logo_url, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!imgRes.ok) throw new Error(`fetch ${imgRes.status}`);
    mediaType = imgRes.headers.get("content-type") ?? mediaType;
    const buf = await imgRes.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024) {
      return Response.json({ error: "image_too_large" }, { status: 413 });
    }
    base64 = Buffer.from(buf).toString("base64");
  } catch (e) {
    return Response.json(
      { error: "logo_fetch_failed", detail: String(e) },
      { status: 502 },
    );
  }

  // SVG logos can't be passed to Claude's vision directly — they're not a
  // supported media type. Reject with a useful hint.
  if (mediaType === "image/svg+xml") {
    return Response.json(
      {
        error: "svg_unsupported",
        hint: "SVG logos can't be analysed by AI yet. Upload a PNG / JPEG / WebP instead.",
      },
      { status: 415 },
    );
  }

  try {
    const client = anthropic();
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "return_theme_from_logo" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/png"
                  | "image/jpeg"
                  | "image/webp"
                  | "image/gif",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extract a station colour palette from this logo.",
            },
          ],
        },
      ],
    });
    const tool = res.content.find((b) => b.type === "tool_use");
    if (!tool || tool.type !== "tool_use") {
      return Response.json({ error: "no_tool_output" }, { status: 502 });
    }
    const t = tool.input as {
      ink: string;
      ink2: string;
      cream: string;
      accent1: string;
      accent2: string;
      accent3: string;
      tone: string;
      rationale: string;
    };
    const cost = estimateCostCents(res.usage);
    await recordGeneration(station.id, "logo_extract", cost);

    const theme: ThemeTokens = {
      ink: t.ink,
      ink2: t.ink2,
      cream: t.cream,
      accent1: t.accent1,
      accent2: t.accent2,
      accent3: t.accent3,
      headingFont: "display",
      tone: t.tone,
    };
    if (apply) {
      await sb
        .from("stations")
        .update({ theme_tokens: theme })
        .eq("id", station.id);
    }
    return Response.json({ theme, rationale: t.rationale, applied: !!apply });
  } catch (e) {
    return Response.json(
      { error: "ai_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
