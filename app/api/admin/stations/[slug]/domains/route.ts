import type { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";
import {
  addProjectDomain,
  removeProjectDomain,
  verifyProjectDomain,
  vercelConfigured,
} from "@/app/lib/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const domainRegex = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

async function ownedStation(slug: string, userId: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("stations")
    .select("id, owner_user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.owner_user_id !== userId) return null;
  return { sb, stationId: data.id as string };
}

// GET — list domains attached to this station, with latest verification state.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await requireUser();
  const { slug } = await params;
  const ctx = await ownedStation(slug, userId);
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 });
  const { data } = await ctx.sb
    .from("custom_domains")
    .select("id, domain, verified_at, vercel_domain_id, created_at")
    .eq("station_id", ctx.stationId)
    .order("created_at", { ascending: true });
  return Response.json({
    domains: data ?? [],
    vercelConfigured: vercelConfigured(),
  });
}

// POST — add a domain to the station + project. Vercel returns verification
// records; persist them so the UI can render DNS instructions.
const addSchema = z.object({ domain: z.string() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await requireUser();
  const { slug } = await params;
  const ctx = await ownedStation(slug, userId);
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 });

  const parsed = addSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }
  const domain = parsed.data.domain.trim().toLowerCase().replace(/\/$/, "");
  if (!domainRegex.test(domain)) {
    return Response.json({ error: "invalid_domain" }, { status: 400 });
  }

  if (!vercelConfigured()) {
    return Response.json(
      {
        error: "vercel_not_configured",
        hint: "Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID to enable custom domains.",
      },
      { status: 503 },
    );
  }

  let result;
  try {
    result = await addProjectDomain(domain);
  } catch (e) {
    return Response.json(
      { error: "vercel_failed", detail: String(e) },
      { status: 502 },
    );
  }

  const { error } = await ctx.sb.from("custom_domains").insert({
    station_id: ctx.stationId,
    domain,
    vercel_domain_id: result.id,
    verified_at: result.verified ? new Date().toISOString() : null,
  });
  if (error) {
    // Roll back the Vercel add to avoid orphaned domains.
    try {
      await removeProjectDomain(domain);
    } catch {
      /* swallow */
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/s/${slug}/domain`);
  return Response.json({
    domain,
    verified: result.verified,
    verification: result.verification ?? [],
  });
}
