import { supabaseAdmin, supabasePublic } from "@/app/lib/supabase";
import type { Show, Sponsor, Station } from "@/app/lib/types";

// Fetch a published station + all its child rows by slug. Used by the
// tenant landing pages, the embed endpoint, and /api/v1/stations/[slug].
export async function getPublicStation(slug: string): Promise<{
  station: Station;
  shows: Show[];
  sponsors: Sponsor[];
} | null> {
  const sb = supabasePublic();
  const { data: station, error } = await sb
    .from("stations")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !station) return null;

  const [shows, sponsors] = await Promise.all([
    sb
      .from("shows")
      .select("*")
      .eq("station_id", station.id)
      .order("display_order", { ascending: true }),
    sb
      .from("sponsors")
      .select("*")
      .eq("station_id", station.id)
      .order("display_order", { ascending: true }),
  ]);

  return {
    station: station as Station,
    shows: (shows.data ?? []) as Show[],
    sponsors: (sponsors.data ?? []) as Sponsor[],
  };
}

// Fetch a station by slug for dashboard editors — bypasses the published flag.
// Caller must already have checked ownership via Clerk before calling.
export async function getAdminStation(slug: string) {
  const sb = supabaseAdmin();
  const { data: station, error } = await sb
    .from("stations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !station) return null;

  const [shows, sponsors] = await Promise.all([
    sb
      .from("shows")
      .select("*")
      .eq("station_id", station.id)
      .order("display_order"),
    sb
      .from("sponsors")
      .select("*")
      .eq("station_id", station.id)
      .order("display_order"),
  ]);

  return {
    station: station as Station,
    shows: (shows.data ?? []) as Show[],
    sponsors: (sponsors.data ?? []) as Sponsor[],
  };
}

// Resolve a host header to a station slug. Supports:
//  1. <slug>.<root>            (wildcard subdomain)
//  2. Custom domain in the custom_domains table
// Returns null if host is the root dashboard domain or unknown.
export async function resolveHostToSlug(
  host: string,
  root: string,
): Promise<string | null> {
  const normalised = host.toLowerCase().split(":")[0];
  const rootNormalised = root.toLowerCase().split(":")[0];

  if (normalised === rootNormalised || normalised === `app.${rootNormalised}`) {
    return null;
  }

  // Wildcard subdomain pattern: <slug>.<root>
  if (normalised.endsWith(`.${rootNormalised}`)) {
    const slug = normalised.slice(0, -`.${rootNormalised}`.length);
    // Reject multi-segment subdomains (e.g. "deep.nested.slug.airwave.io")
    if (slug && !slug.includes(".")) return slug;
  }

  // Custom domain lookup
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("custom_domains")
    .select("station_id, verified_at, stations(slug)")
    .eq("domain", normalised)
    .not("verified_at", "is", null)
    .maybeSingle();

  const stationSlug = (data as unknown as { stations?: { slug?: string } } | null)
    ?.stations?.slug;
  return stationSlug ?? null;
}
