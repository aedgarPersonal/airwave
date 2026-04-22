import { notFound } from "next/navigation";
import { getOwnedStation } from "@/app/lib/auth";
import { togglePublished } from "../actions";

export default async function PublishPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getOwnedStation(slug);
  if (!station) notFound();
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";
  const url = `https://${slug}.${root}`;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display">
        {station.published ? "Published" : "Publish your station"}
      </h1>
      <p className="mt-1 text-muted text-sm">
        Publishing makes your station URL and embed work for the public. You
        can unpublish at any time.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-bg-2 p-6">
        <p className="font-display text-xl">
          {station.name}{" "}
          <span
            className={`ml-2 text-xs font-display tracking-widest px-2 py-0.5 rounded ${
              station.published
                ? "bg-accent-2/20 text-accent-2"
                : "bg-white/10 text-muted"
            }`}
          >
            {station.published ? "LIVE" : "DRAFT"}
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">
          {station.published ? (
            <>
              Available at{" "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-fg"
              >
                {url}
              </a>
            </>
          ) : (
            "Nobody can see your station page or use your embed until you publish."
          )}
        </p>

        <form
          action={togglePublished.bind(null, slug, !station.published)}
          className="mt-6 flex items-center justify-end gap-3"
        >
          {station.published ? (
            <button
              type="submit"
              className="rounded-full border border-line px-5 py-2.5 text-sm hover:bg-bg-3 transition"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="submit"
              className="rounded-full bg-accent text-bg px-5 py-2.5 font-medium hover:opacity-90 transition"
            >
              Publish station
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
