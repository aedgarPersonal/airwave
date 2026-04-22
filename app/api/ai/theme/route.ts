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
import type { ThemeTokens } from "@/app/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = {
  name: "return_theme",
  description:
    "Return a validated set of station theme tokens for the public page and PWA.",
  input_schema: {
    type: "object" as const,
    properties: {
      ink: {
        type: "string",
        pattern: "^#[0-9a-fA-F]{6}$",
        description:
          "Background colour — almost always near-black. Must pass WCAG AA contrast against 'cream'.",
      },
      ink2: {
        type: "string",
        pattern: "^#[0-9a-fA-F]{6}$",
        description:
          "Secondary background for surfaces — slightly lighter than ink.",
      },
      cream: {
        type: "string",
        pattern: "^#[0-9a-fA-F]{6}$",
        description: "Body text colour, off-white. Must pass WCAG AA against ink.",
      },
      accent1: {
        type: "string",
        pattern: "^#[0-9a-fA-F]{6}$",
        description: "Primary brand accent.",
      },
      accent2: {
        type: "string",
        pattern: "^#[0-9a-fA-F]{6}$",
        description: "Secondary accent — used for calls to action.",
      },
      accent3: {
        type: "string",
        pattern: "^#[0-9a-fA-F]{6}$",
        description: "Tertiary accent — used for alerts and LIVE indicators.",
      },
      tone: {
        type: "string",
        description:
          "Short label summarising the mood (e.g. 'caribbean', 'latin', 'african', 'minimal', 'neon').",
      },
      rationale: {
        type: "string",
        description:
          "One-line explanation of why these colours fit the station.",
      },
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

const SYSTEM = `You design colour palettes for grassroots radio station websites. The template is dark by default (near-black background, off-white text, three accent colours).

Rules:
- The palette must pass WCAG AA contrast: cream-on-ink and cream-on-ink2 both need ≥4.5 contrast ratio.
- Accent1 is the primary brand colour and usually appears as buttons, icons, and the "on air" dot.
- Accent2 is the secondary, used for CTAs like "Donate" and "Now On Air" chrome — it should read well as a button background with ink text.
- Accent3 is the tertiary, used for "LIVE" indicators and highlights — it should feel energetic.
- Avoid muddy greens, pure saturated blues, or gradients that muddy against text.
- Cultural sensitivity matters: for Caribbean stations lean toward Jamaican flag colours (green/gold/black/red) or Caribbean sea-and-sun palettes; for African stations lean toward warm earth tones and rich kente-inspired reds/golds; for Latin stations lean toward warm sunset oranges / bold reds; etc. Respect the description; don't default to "Caribbean" just because the station plays reggae — read the vibe.
- Do NOT output prose. Only call return_theme.`;

export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (!aiConfigured()) {
    return Response.json({ error: "ai_not_configured" }, { status: 500 });
  }
  const { slug, description, apply } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    description?: string;
    apply?: boolean;
  };
  if (!slug || !description || description.length < 10) {
    return Response.json({ error: "invalid_input" }, { status: 400 });
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
  const limit = await checkRateLimit(station.id, "theme");
  if (!limit.ok) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const client = anthropic();
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "return_theme" },
      messages: [
        {
          role: "user",
          content: `Generate a theme for a radio station described as:\n\n${description}`,
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
    await recordGeneration(station.id, "theme", cost);

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
