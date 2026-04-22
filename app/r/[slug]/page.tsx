// Preview-by-slug route — renders the tenant station page directly, without
// going through the subdomain rewrite. Useful on the default *.vercel.app URL
// before wildcard DNS is configured. Not the canonical path; tenants should
// be accessed via their subdomain or custom domain in production.
import TenantPage from "@/app/tenant/[host]/page";

export default async function PreviewBySlug({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";
  // Synthesise a host string so the shared renderer resolves the right station.
  const host = `${slug}.${root}`;
  return <TenantPage params={Promise.resolve({ host })} />;
}
