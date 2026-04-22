import { notFound } from "next/navigation";
import { getOwnedStation } from "@/app/lib/auth";
import { saveStream } from "../actions";

export default async function StreamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getOwnedStation(slug);
  if (!station) notFound();

  const isHttp = station.stream_url.startsWith("http://");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display">Stream</h1>
      <p className="mt-1 text-muted text-sm">
        Where listeners connect to the audio, and (optionally) where Airwave
        reads now-playing metadata from.
      </p>

      {isHttp && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          Your stream URL is <strong>HTTP</strong>, which modern browsers block
          when embedded on an HTTPS site. Ask your radio host (Radioca.st,
          Shoutca.st, etc.) for the HTTPS version of the stream URL.
        </div>
      )}

      <form action={saveStream.bind(null, slug)} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Stream URL</span>
          <input
            name="stream_url"
            type="url"
            defaultValue={station.stream_url}
            required
            className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <span className="mt-1 block text-xs text-muted">
            Usually looks like https://yourstation.radioca.st/stream
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Status URL (optional)</span>
          <input
            name="status_url"
            type="url"
            defaultValue={station.status_url ?? ""}
            className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <span className="mt-1 block text-xs text-muted">
            Icecast exposes <code>status-json.xsl</code>. Providing it lights up
            the now-playing track and LIVE indicator. Leave blank if your host
            doesn&apos;t offer one.
          </span>
        </label>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            className="rounded-full bg-accent text-bg px-5 py-2.5 font-medium hover:opacity-90 transition"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
