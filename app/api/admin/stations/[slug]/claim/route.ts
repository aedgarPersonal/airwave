import type { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-shot claim endpoint for seeded stations. Transfers ownership of a
// station whose current owner_user_id matches CLAIM_TOKEN to the caller's
// Clerk userId. Exists so the Riddim WSM seed row (owner_user_id =
// "seed-owner-riddim") can be handed over to the real station owner on first
// sign-in without ever letting an end user just grab any station.
//
// POST  /api/admin/stations/[slug]/claim
//   headers: x-claim-token: <CLAIM_TOKEN env>
// On success, the station's owner_user_id becomes the caller's userId and
// the claim token is refused for the same slug thereafter.

const schema = z.object({
  expected_owner: z.string().min(1), // e.g. "seed-owner-riddim"
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await requireUser();
  const { slug } = await params;

  const token = req.headers.get("x-claim-token");
  if (!process.env.CLAIM_TOKEN) {
    return Response.json(
      { error: "claim_disabled", hint: "Set CLAIM_TOKEN to enable." },
      { status: 503 },
    );
  }
  if (token !== process.env.CLAIM_TOKEN) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return Response.json(
      { error: "invalid_input", issues: body.error.issues },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();
  const { data: station } = await sb
    .from("stations")
    .select("id, owner_user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!station) return Response.json({ error: "not_found" }, { status: 404 });
  if (station.owner_user_id !== body.data.expected_owner) {
    return Response.json(
      {
        error: "already_claimed",
        hint: `Current owner is not ${body.data.expected_owner}.`,
      },
      { status: 409 },
    );
  }

  const { error } = await sb
    .from("stations")
    .update({ owner_user_id: userId })
    .eq("id", station.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/dashboard");
  return Response.json({ slug, owner_user_id: userId });
}
