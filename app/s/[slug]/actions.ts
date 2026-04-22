"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireUser } from "@/app/lib/auth";

async function ensureOwned(slug: string) {
  const userId = await requireUser();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("stations")
    .select("id, owner_user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.owner_user_id !== userId) {
    throw new Error("Station not found");
  }
  return { sb, stationId: data.id as string };
}

// Identity tab --------------------------------------------------------------
const identitySchema = z.object({
  name: z.string().min(2).max(80),
  tagline: z.string().max(140).optional().or(z.literal("")),
  description: z.string().max(600).optional().or(z.literal("")),
  origin: z.string().max(80).optional().or(z.literal("")),
  timezone: z.string().min(3).max(50),
  copyright_since: z.coerce.number().int().min(1900).max(2100).optional(),
});

export async function saveIdentity(slug: string, formData: FormData) {
  const { sb, stationId } = await ensureOwned(slug);
  const parsed = identitySchema.parse({
    name: formData.get("name"),
    tagline: formData.get("tagline") || undefined,
    description: formData.get("description") || undefined,
    origin: formData.get("origin") || undefined,
    timezone: formData.get("timezone") || "America/Toronto",
    copyright_since: formData.get("copyright_since") || undefined,
  });
  const { error } = await sb
    .from("stations")
    .update({
      name: parsed.name,
      tagline: parsed.tagline || null,
      description: parsed.description || null,
      origin: parsed.origin || null,
      timezone: parsed.timezone,
      copyright_since: parsed.copyright_since ?? null,
    })
    .eq("id", stationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}/identity`);
}

// Stream tab ----------------------------------------------------------------
const streamSchema = z.object({
  stream_url: z.string().url(),
  status_url: z.string().url().optional().or(z.literal("")),
});

export async function saveStream(slug: string, formData: FormData) {
  const { sb, stationId } = await ensureOwned(slug);
  const parsed = streamSchema.parse({
    stream_url: formData.get("stream_url"),
    status_url: formData.get("status_url") || undefined,
  });
  const { error } = await sb
    .from("stations")
    .update({
      stream_url: parsed.stream_url,
      status_url: parsed.status_url || null,
    })
    .eq("id", stationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}/stream`);
}

// Contact / Donate / Chat JSONB --------------------------------------------
export async function saveContact(slug: string, formData: FormData) {
  const { sb, stationId } = await ensureOwned(slug);
  const contact = {
    landline: (formData.get("landline") as string) || undefined,
    mobile: (formData.get("mobile") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    twitter: (formData.get("twitter") as string) || undefined,
    facebookUrl: (formData.get("facebookUrl") as string) || undefined,
    instagramUrl: (formData.get("instagramUrl") as string) || undefined,
  };
  // Strip blanks so the JSONB stays tidy.
  const cleaned = Object.fromEntries(
    Object.entries(contact).filter(([, v]) => v && String(v).trim() !== ""),
  );
  const { error } = await sb
    .from("stations")
    .update({ contact: cleaned })
    .eq("id", stationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}/contact`);
}

export async function saveDonate(slug: string, formData: FormData) {
  const { sb, stationId } = await ensureOwned(slug);
  const donate = {
    url: (formData.get("url") as string) || undefined,
    label: (formData.get("label") as string) || undefined,
    pitch: (formData.get("pitch") as string) || undefined,
  };
  const cleaned = Object.fromEntries(
    Object.entries(donate).filter(([, v]) => v && String(v).trim() !== ""),
  );
  const { error } = await sb
    .from("stations")
    .update({ donate: cleaned })
    .eq("id", stationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}/donate`);
}

// Shows CRUD ---------------------------------------------------------------
// Accepts either "HH:MM" (from an <input type="time">) or a raw minute count.
const minutes = z.preprocess((v) => {
  if (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v)) {
    const [h, m] = v.split(":").map(Number);
    return h * 60 + m;
  }
  return Number(v);
}, z.number().int().min(0).max(1439));

const showSchema = z.object({
  day: z.enum(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Daily"]),
  start_min: minutes,
  end_min: minutes,
  title: z.string().min(1).max(80),
  host: z.string().max(80).optional().or(z.literal("")),
  crosses_midnight: z
    .union([z.literal("on"), z.literal("off"), z.literal("")])
    .transform((v) => v === "on"),
});

export async function addShow(slug: string, formData: FormData) {
  const { sb, stationId } = await ensureOwned(slug);
  const parsed = showSchema.parse({
    day: formData.get("day"),
    start_min: formData.get("start_min"),
    end_min: formData.get("end_min"),
    title: formData.get("title"),
    host: formData.get("host") || undefined,
    crosses_midnight: formData.get("crosses_midnight") || "off",
  });
  const { error } = await sb.from("shows").insert({
    station_id: stationId,
    day: parsed.day,
    start_min: parsed.start_min,
    end_min: parsed.end_min,
    title: parsed.title,
    host: parsed.host || null,
    crosses_midnight: parsed.crosses_midnight,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}/schedule`);
}

export async function deleteShow(slug: string, showId: string) {
  const { sb, stationId } = await ensureOwned(slug);
  const { error } = await sb
    .from("shows")
    .delete()
    .eq("id", showId)
    .eq("station_id", stationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}/schedule`);
}

// Sponsors CRUD ------------------------------------------------------------
const sponsorSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().max(80).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  link: z.string().url().optional().or(z.literal("")),
  accent: z.enum(["green", "gold", "red", "sun"]),
});

export async function addSponsor(slug: string, formData: FormData) {
  const { sb, stationId } = await ensureOwned(slug);
  const parsed = sponsorSchema.parse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    location: formData.get("location") || undefined,
    link: formData.get("link") || undefined,
    accent: formData.get("accent") || "green",
  });
  const { error } = await sb.from("sponsors").insert({
    station_id: stationId,
    name: parsed.name,
    category: parsed.category || null,
    location: parsed.location || null,
    link: parsed.link || null,
    accent: parsed.accent,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}/sponsors`);
}

export async function deleteSponsor(slug: string, sponsorId: string) {
  const { sb, stationId } = await ensureOwned(slug);
  const { error } = await sb
    .from("sponsors")
    .delete()
    .eq("id", sponsorId)
    .eq("station_id", stationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}/sponsors`);
}

// Publish ------------------------------------------------------------------
export async function togglePublished(slug: string, publish: boolean) {
  const { sb, stationId } = await ensureOwned(slug);
  const { error } = await sb
    .from("stations")
    .update({ published: publish })
    .eq("id", stationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/publish`);
}
