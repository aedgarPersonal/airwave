import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveHostToSlug, getPublicStation } from "@/app/lib/stations";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();
  const slug = await resolveHostToSlug(host, ROOT);

  if (!slug) {
    // Dashboard / root origin manifest — tiny default.
    return {
      name: "Airwave",
      short_name: "Airwave",
      start_url: "/",
      display: "standalone",
      background_color: "#09090b",
      theme_color: "#6366f1",
      icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    };
  }

  const data = await getPublicStation(slug);
  if (!data) {
    return { name: "Airwave", start_url: "/", display: "standalone", icons: [] };
  }
  const { station } = data;
  const theme = station.theme_tokens;

  return {
    name: `${station.name}${station.tagline ? " — " + station.tagline : ""}`,
    short_name: station.name,
    description: station.description ?? undefined,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: theme?.ink ?? "#0b0f0b",
    theme_color: theme?.accent1 ?? "#009b3a",
    categories: ["music", "entertainment"],
    icons: station.logo_url
      ? [
          { src: station.logo_url, sizes: "192x192", type: "image/png" },
          { src: station.logo_url, sizes: "512x512", type: "image/png" },
        ]
      : [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
  };
}
