import type { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
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
    .max(60),
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

  if (parsed.data.shows.length === 0) {
    return Response.json({ inserted: 0 });
  }

  const { error } = await sb.from("shows").insert(
    parsed.data.shows.map((s, i) => ({
      station_id: station.id,
      day: s.day,
      start_min: s.start_min,
      end_min: s.end_min,
      title: s.title,
      host: s.host,
      crosses_midnight: s.crosses_midnight,
      display_order: 1000 + i,
    })),
  );
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/s/${slug}/schedule`);
  return Response.json({ inserted: parsed.data.shows.length });
}
