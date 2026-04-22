import type { NextRequest } from "next/server";
import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max logo size: 2MB after upload. Generated logos are always smaller.
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

async function ownedStation(slug: string, userId: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("stations")
    .select("id, owner_user_id, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.owner_user_id !== userId) return null;
  return { sb, station: data };
}

// PUT (upload) — multipart form with a "file" field. Stores in Vercel Blob
// and updates stations.logo_url. Also cleans up the previous blob if any.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await requireUser();
  const { slug } = await params;
  const ctx = await ownedStation(slug, userId);
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      {
        error: "blob_not_configured",
        hint: "Set BLOB_READ_WRITE_TOKEN to enable logo uploads.",
      },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "no_file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json(
      { error: "unsupported_type", hint: "PNG, JPEG, WebP, or SVG." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "too_large", max: MAX_BYTES },
      { status: 413 },
    );
  }

  const ext =
    file.type === "image/svg+xml"
      ? "svg"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  const pathname = `stations/${ctx.station.id}/logo-${Date.now()}.${ext}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  const { error } = await ctx.sb
    .from("stations")
    .update({ logo_url: blob.url })
    .eq("id", ctx.station.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Best-effort delete of previous blob.
  if (ctx.station.logo_url && ctx.station.logo_url.includes("blob.vercel-storage.com")) {
    try {
      await del(ctx.station.logo_url);
    } catch {
      /* swallow — not worth failing the request */
    }
  }

  revalidatePath(`/s/${slug}/identity`);
  return Response.json({ logo_url: blob.url });
}

// DELETE — clears logo_url and tries to free the blob.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userId = await requireUser();
  const { slug } = await params;
  const ctx = await ownedStation(slug, userId);
  if (!ctx) return Response.json({ error: "not_found" }, { status: 404 });
  if (ctx.station.logo_url?.includes("blob.vercel-storage.com")) {
    try {
      await del(ctx.station.logo_url);
    } catch {
      /* swallow */
    }
  }
  await ctx.sb
    .from("stations")
    .update({ logo_url: null })
    .eq("id", ctx.station.id);
  revalidatePath(`/s/${slug}/identity`);
  return Response.json({ ok: true });
}
