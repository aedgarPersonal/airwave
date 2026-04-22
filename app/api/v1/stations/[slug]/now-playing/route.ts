import { supabasePublic } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IcecastSource = {
  title?: string;
  server_name?: string;
  server_description?: string;
  server_type?: string;
  audio_info?: string;
  genre?: string;
  listeners?: number;
  bitrate?: number;
  listenurl?: string;
  stream_start?: string;
};
type IcecastStatus = {
  icestats?: { source?: IcecastSource | IcecastSource[] };
};

function isActive(s: IcecastSource) {
  return Boolean(s.server_type || s.audio_info || s.stream_start || s.bitrate);
}
function mountType(s: IcecastSource): "live" | "autodj" | "stream" | "other" {
  const url = (s.listenurl || "").toLowerCase();
  if (url.endsWith("/live")) return "live";
  if (url.endsWith("/autodj")) return "autodj";
  if (url.endsWith("/stream")) return "stream";
  return "other";
}

const OFFLINE = {
  online: false,
  isLive: false,
  activeMount: null as "live" | "autodj" | "stream" | "other" | null,
  title: null as string | null,
  listeners: 0,
  bitrate: null as number | null,
  genre: null as string | null,
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const sb = supabasePublic();
  const { data: station } = await sb
    .from("stations")
    .select("status_url, published")
    .eq("slug", slug)
    .maybeSingle();

  if (!station?.published || !station.status_url) {
    return Response.json(OFFLINE, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const res = await fetch(station.status_url, {
      headers: { "User-Agent": "Airwave/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as IcecastStatus;

    const sources = json.icestats?.source;
    const arr = Array.isArray(sources) ? sources : sources ? [sources] : [];
    const activeByMount: Partial<Record<ReturnType<typeof mountType>, IcecastSource>> = {};
    for (const s of arr) if (isActive(s)) activeByMount[mountType(s)] = s;

    const isLive = Boolean(activeByMount.live);
    const primary =
      activeByMount.live ??
      activeByMount.autodj ??
      activeByMount.stream ??
      arr.find(isActive) ??
      arr[0];

    return Response.json(
      {
        online: !!primary,
        isLive,
        activeMount: primary ? mountType(primary) : null,
        title: primary?.title && primary.title !== "Unknown" ? primary.title : null,
        listeners: arr.reduce((sum, s) => sum + (s.listeners ?? 0), 0),
        bitrate: primary?.bitrate ?? null,
        genre: primary?.genre ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(OFFLINE, { headers: { "Cache-Control": "no-store" } });
  }
}
