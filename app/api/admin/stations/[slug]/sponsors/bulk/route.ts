import type { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  sponsors: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        category: z.string().max(80).nullable(),
        location: z.string().max(120).nullable(),
        link: z.string().url().nullable().or(z.literal("").transform(() => null)),
        accent: z.enum(["green", "gold", "red", "sun"]),
      }),
    )
    .max(40),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await requireUser();
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_input", issues: parsed.error.issues },
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
  if (parsed.data.sponsors.length === 0) {
    return Response.json({ inserted: 0 });
  }
  const { error } = await sb.from("sponsors").insert(
    parsed.data.sponsors.map((s, i) => ({
      station_id: station.id,
      name: s.name,
      category: s.category,
      location: s.location,
      link: s.link,
      accent: s.accent,
      display_order: 1000 + i,
    })),
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  revalidatePath(`/s/${slug}/sponsors`);
  return Response.json({ inserted: parsed.data.sponsors.length });
}
