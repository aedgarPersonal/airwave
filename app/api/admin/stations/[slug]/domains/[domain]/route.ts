import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";
import {
  removeProjectDomain,
  verifyProjectDomain,
  vercelConfigured,
} from "@/app/lib/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownedDomain(
  slug: string,
  userId: string,
  domain: string,
) {
  const sb = supabaseAdmin();
  const { data: station } = await sb
    .from("stations")
    .select("id, owner_user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!station || station.owner_user_id !== userId) return null;
  const { data: row } = await sb
    .from("custom_domains")
    .select("id, domain, verified_at, vercel_domain_id")
    .eq("station_id", station.id)
    .eq("domain", domain)
    .maybeSingle();
  if (!row) return null;
  return { sb, stationId: station.id as string, row };
}

// Re-run verification against Vercel (pulls latest cert/DNS status).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; domain: string }> },
) {
  const userId = await requireUser();
  const { slug, domain } = await params;
  const d = decodeURIComponent(domain);
  const ctx = await ownedDomain(slug, userId, d);
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 });
  if (!vercelConfigured()) {
    return Response.json({ error: "vercel_not_configured" }, { status: 503 });
  }
  try {
    const result = await verifyProjectDomain(d);
    await ctx.sb
      .from("custom_domains")
      .update({
        verified_at: result.verified ? new Date().toISOString() : null,
      })
      .eq("id", ctx.row.id);
    revalidatePath(`/s/${slug}/domain`);
    return Response.json({
      verified: result.verified,
      verification: result.verification ?? [],
    });
  } catch (e) {
    return Response.json(
      { error: "vercel_failed", detail: String(e) },
      { status: 502 },
    );
  }
}

// Remove the domain from both Vercel and the station.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; domain: string }> },
) {
  const userId = await requireUser();
  const { slug, domain } = await params;
  const d = decodeURIComponent(domain);
  const ctx = await ownedDomain(slug, userId, d);
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 });
  if (vercelConfigured()) {
    try {
      await removeProjectDomain(d);
    } catch {
      // Proceed anyway — we at least want the local record gone.
    }
  }
  await ctx.sb.from("custom_domains").delete().eq("id", ctx.row.id);
  revalidatePath(`/s/${slug}/domain`);
  return Response.json({ ok: true });
}
