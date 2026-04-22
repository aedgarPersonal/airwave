import { notFound } from "next/navigation";
import { getOwnedStation } from "@/app/lib/auth";
import { DomainManager } from "@/app/components/dashboard/DomainManager";

export default async function DomainPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await getOwnedStation(slug))) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-display">Custom domain</h1>
      <p className="mt-1 text-muted text-sm">
        Point a domain you own at your Airwave station. Listeners install the
        PWA from your brand URL instead of a shared Airwave subdomain.
      </p>

      <div className="mt-8">
        <DomainManager slug={slug} />
      </div>
    </div>
  );
}
