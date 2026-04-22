import type { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";
import { DEFAULT_THEME } from "@/app/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  station: z.object({
    name: z.string().min(2).max(80),
    tagline: z.string().max(140).nullable().optional(),
    description: z.string().max(600).nullable().optional(),
    origin: z.string().max(80).nullable().optional(),
    stream_url: z.string().url(),
    status_url: z.string().url().nullable().optional(),
    timezone: z.string().default("America/Toronto"),
    copyright_since: z.number().int().min(1900).max(2100).nullable().optional(),
  }),
  contact: z.record(z.string(), z.string().optional()).optional(),
  donate: z.record(z.string(), z.string().optional()).optional(),
  theme: z
    .object({
      ink: z.string(),
      ink2: z.string(),
      cream: z.string(),
      accent1: z.string(),
      accent2: z.string(),
      accent3: z.string(),
      headingFont: z.string().default("display"),
      tone: z.string(),
    })
    .nullable()
    .optional(),
  shows: z
    .array(
      z.object({
        day: z.enum(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Daily"]),
        start_min: z.number().int().min(0).max(1439),
        end_min: z.number().int().min(0).max(1439),
        title: z.string().min(1).max(80),
        host: z.string().max(80).nullable(),
        crosses_midnight: z.boolean(),
      }),
    )
    .max(60)
    .default([]),
  sponsors: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        category: z.string().max(80).nullable(),
        location: z.string().max(120).nullable(),
        link: z.string().url().nullable(),
        accent: z.enum(["green", "gold", "red", "sun"]),
      }),
    )
    .max(40)
    .default([]),
});

export async function POST(req: NextRequest) {
  const userId = await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { slug, station, contact, donate, theme, shows, sponsors } =
    parsed.data;

  const sb = supabaseAdmin();
  // Reject slug collisions before spending inserts.
  const { data: existing } = await sb
    .from("stations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return Response.json(
      { error: "slug_taken", hint: `Pick a different slug — ${slug} is taken.` },
      { status: 409 },
    );
  }

  // Clean the JSONB payloads of nulls / blank strings.
  const clean = (obj?: Record<string, string | null | undefined>) => {
    if (!obj) return {};
    return Object.fromEntries(
      Object.entries(obj).filter(
        ([, v]) => typeof v === "string" && v.trim() !== "",
      ),
    );
  };

  const { data: newStation, error: insertErr } = await sb
    .from("stations")
    .insert({
      owner_user_id: userId,
      slug,
      name: station.name,
      tagline: station.tagline || null,
      description: station.description || null,
      origin: station.origin || null,
      timezone: station.timezone,
      stream_url: station.stream_url,
      status_url: station.status_url || null,
      copyright_since: station.copyright_since ?? null,
      theme_tokens: theme ?? DEFAULT_THEME,
      contact: clean(contact),
      donate: clean(donate),
      published: false,
    })
    .select("id")
    .single();
  if (insertErr || !newStation) {
    return Response.json(
      { error: "station_insert_failed", detail: insertErr?.message },
      { status: 500 },
    );
  }

  if (shows.length > 0) {
    const { error: e } = await sb.from("shows").insert(
      shows.map((s, i) => ({
        station_id: newStation.id,
        day: s.day,
        start_min: s.start_min,
        end_min: s.end_min,
        title: s.title,
        host: s.host,
        crosses_midnight: s.crosses_midnight,
        display_order: i + 1,
      })),
    );
    if (e) {
      // Partial-success is OK — the station exists and the owner can retry.
      console.warn("shows insert failed", e);
    }
  }

  if (sponsors.length > 0) {
    const { error: e } = await sb.from("sponsors").insert(
      sponsors.map((s, i) => ({
        station_id: newStation.id,
        name: s.name,
        category: s.category,
        location: s.location,
        link: s.link,
        accent: s.accent,
        display_order: i + 1,
      })),
    );
    if (e) console.warn("sponsors insert failed", e);
  }

  revalidatePath("/dashboard");
  return Response.json({ slug });
}
