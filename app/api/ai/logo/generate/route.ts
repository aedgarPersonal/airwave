import type { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";
import { checkRateLimit, recordGeneration } from "@/app/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generates a wordmark-style logo from the station name + palette via OpenAI
// gpt-image-1. Flagged "v1.1" — stashes behind OPENAI_API_KEY. Ideogram often
// renders text more accurately; wire that in when the station upgrades.
export async function POST(req: NextRequest) {
  const userId = await requireUser();
  const { slug, prompt: extra } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    prompt?: string;
  };
  if (!slug) return Response.json({ error: "invalid_input" }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "image_ai_not_configured", hint: "Set OPENAI_API_KEY." },
      { status: 503 },
    );
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "blob_not_configured" },
      { status: 503 },
    );
  }

  const sb = supabaseAdmin();
  const { data: station } = await sb
    .from("stations")
    .select("id, owner_user_id, name, tagline, theme_tokens")
    .eq("slug", slug)
    .maybeSingle();
  if (!station || station.owner_user_id !== userId) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const limit = await checkRateLimit(station.id, "logo");
  if (!limit.ok) {
    return Response.json({ error: "rate_limited", limit: limit.limit }, { status: 429 });
  }

  const theme = station.theme_tokens as {
    accent1?: string;
    accent2?: string;
    accent3?: string;
    ink?: string;
  } | null;
  const prompt = `Minimal modern wordmark-style app icon for a radio station called "${station.name}"${station.tagline ? ` (tagline: ${station.tagline})` : ""}. Square format. Solid dark background near ${theme?.ink ?? "#0b0f0b"}. Use two accent colours roughly like ${theme?.accent1 ?? "#009b3a"} and ${theme?.accent2 ?? "#fed100"}. Bold sans-serif letters, cleanly spaced, high contrast, no gradient noise, no frames, no emoji, no stock-photo imagery. Centered on the square. ${extra ?? ""}`.trim();

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    return Response.json(
      { error: "openai_network", detail: String(e) },
      { status: 502 },
    );
  }
  if (!res.ok) {
    const detail = await res.text();
    return Response.json(
      { error: "openai_failed", status: res.status, detail },
      { status: 502 },
    );
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = json.data?.[0];
  if (!item) {
    return Response.json({ error: "no_image" }, { status: 502 });
  }

  let bytes: ArrayBuffer;
  if (item.b64_json) {
    bytes = Buffer.from(item.b64_json, "base64").buffer as ArrayBuffer;
  } else if (item.url) {
    const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(30_000) });
    bytes = await imgRes.arrayBuffer();
  } else {
    return Response.json({ error: "no_image" }, { status: 502 });
  }

  const path = `stations/${station.id}/logo-gen-${Date.now()}.png`;
  const blob = await put(path, bytes, {
    access: "public",
    addRandomSuffix: false,
    contentType: "image/png",
  });

  await sb
    .from("stations")
    .update({ logo_url: blob.url })
    .eq("id", station.id);

  // gpt-image-1 pricing: ~$0.04 per 1024x1024 (standard quality). Record as 4 cents.
  await recordGeneration(station.id, "logo", 4);
  revalidatePath(`/s/${slug}/identity`);
  return Response.json({ logo_url: blob.url, prompt });
}
