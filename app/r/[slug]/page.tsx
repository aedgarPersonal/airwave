// Preview-by-slug route — renders the tenant station page directly, without
// going through the subdomain rewrite. Useful on the default *.vercel.app URL
// before wildcard DNS is configured. Not the canonical path; tenants should
// be accessed via their subdomain or custom domain in production.
import type { Metadata } from "next";
import TenantPage from "@/app/tenant/[host]/page";
import { getPublicStation } from "@/app/lib/stations";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicStation(slug);
  if (!data) return { title: "Airwave", robots: { index: false } };
  const { station } = data;
  const title = station.tagline
    ? `${station.name} — ${station.tagline}`
    : station.name;
  const description = station.description ?? `${station.name} — tune in live.`;
  return {
    title,
    description,
    robots: { index: false }, // preview URLs shouldn't be indexed; canonical is the subdomain
    applicationName: station.name,
    appleWebApp: {
      capable: true,
      title: station.name,
      statusBarStyle: "black-translucent",
    },
    icons: station.logo_url
      ? { icon: station.logo_url, apple: station.logo_url }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: station.logo_url ? [station.logo_url] : undefined,
    },
    other: {
      "theme-color": station.theme_tokens?.accent1 ?? "#009b3a",
    },
  };
}

export default async function PreviewBySlug({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = `${slug}.${ROOT}`;
  return <TenantPage params={Promise.resolve({ host })} />;
}
