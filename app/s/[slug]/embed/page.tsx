import { notFound } from "next/navigation";
import { getOwnedStation } from "@/app/lib/auth";
import { CopyButton } from "@/app/components/dashboard/CopyButton";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getOwnedStation(slug);
  if (!station) notFound();

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";
  const origin = `https://app.${root}`;
  const stationUrl = `https://${slug}.${root}`;
  const snippet = `<script src="${origin}/embed.js?s=${slug}" async defer></script>\n<div data-airwave-station="${slug}"></div>`;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display">Embed on your site</h1>
      <p className="mt-1 text-muted text-sm">
        Paste this snippet into your existing radio station site. Updates you
        make in Airwave appear on your site automatically — no redeploy.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-bg-2 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-line text-xs">
          <span className="text-muted">Embed snippet</span>
          <CopyButton text={snippet} />
        </div>
        <pre className="px-4 py-4 text-xs overflow-x-auto">
          <code>{snippet}</code>
        </pre>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-bg-2 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-line text-xs">
          <span className="text-muted">Your mobile-installable station URL</span>
          <CopyButton text={stationUrl} />
        </div>
        <pre className="px-4 py-4 text-xs overflow-x-auto">
          <code>{stationUrl}</code>
        </pre>
        <div className="px-4 py-3 border-t border-line text-xs text-muted">
          Share this URL in station IDs, your socials, and the embed&apos;s
          &ldquo;Get the app&rdquo; button. Listeners open it once on their
          phone and &ldquo;Add to Home Screen&rdquo; to install.
        </div>
      </div>

      {!station.published && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          Your station is still a <strong>draft</strong>. The embed and URL
          will 404 for listeners until you publish it from the{" "}
          <a href={`/s/${slug}/publish`} className="underline">
            Publish tab
          </a>
          .
        </div>
      )}
    </div>
  );
}
