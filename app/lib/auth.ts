import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/app/lib/supabase";
import type { Station } from "@/app/lib/types";

// Thin wrapper that resolves the Clerk user to a Supabase station row the
// user owns. Redirects to sign-in if unauthenticated. Returns null if the
// user doesn't own the requested slug (caller should 404).
export async function requireUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

export async function getOwnedStation(
  slug: string,
): Promise<Station | null> {
  const userId = await requireUser();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("stations")
    .select("*")
    .eq("slug", slug)
    .eq("owner_user_id", userId)
    .maybeSingle();
  return (data as Station) ?? null;
}

export async function listOwnedStations() {
  const userId = await requireUser();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("stations")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Station[]);
}
