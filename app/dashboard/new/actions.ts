"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";
import { DEFAULT_THEME } from "@/app/lib/types";

const schema = z.object({
  name: z.string().min(2).max(80),
  // Reserved slugs that would collide with platform routes or Clerk pages.
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/)
    .refine(
      (s) =>
        ![
          "app",
          "admin",
          "api",
          "dashboard",
          "sign-in",
          "sign-up",
          "s",
          "www",
          "embed",
          "blog",
          "docs",
          "static",
          "assets",
        ].includes(s),
      { message: "That slug is reserved." },
    ),
  tagline: z.string().max(140).optional(),
  stream_url: z.string().url(),
  status_url: z.string().url().optional().or(z.literal("")),
});

export async function createStation(formData: FormData) {
  const userId = await requireUser();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    tagline: formData.get("tagline") || undefined,
    stream_url: formData.get("stream_url"),
    status_url: formData.get("status_url") || undefined,
  });
  if (!parsed.success) {
    // TODO: surface field errors in the UI. For v1 we rely on HTML5
    // validation for the common cases and fail loudly for edge cases.
    throw new Error(
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"),
    );
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from("stations").insert({
    owner_user_id: userId,
    slug: parsed.data.slug,
    name: parsed.data.name,
    tagline: parsed.data.tagline ?? null,
    stream_url: parsed.data.stream_url,
    status_url: parsed.data.status_url || null,
    theme_tokens: DEFAULT_THEME,
  });
  if (error) throw new Error(error.message);

  redirect(`/s/${parsed.data.slug}/identity`);
}
