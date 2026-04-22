import { notFound } from "next/navigation";
import { getAdminStation } from "@/app/lib/stations";
import { getOwnedStation } from "@/app/lib/auth";
import { addSponsor, deleteSponsor } from "../actions";
import { SponsorImporter } from "@/app/components/dashboard/SponsorImporter";

const ACCENT_DOT: Record<string, string> = {
  green: "#009b3a",
  gold: "#fed100",
  red: "#e1403b",
  sun: "#ff8a2b",
};

export default async function SponsorsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await getOwnedStation(slug))) notFound();
  const admin = await getAdminStation(slug);
  if (!admin) notFound();
  const { sponsors } = admin;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-display">Community Spotlight</h1>
      <p className="mt-1 text-muted text-sm">
        Local businesses, partners, and community features. These render as a
        grid on your station page and in your embed.
      </p>

      <div className="mt-8">
        <SponsorImporter slug={slug} />
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-bg-2 p-5">
        <p className="text-xs font-display tracking-widest text-muted">
          ADD A SPONSOR MANUALLY
        </p>
        <form
          action={async (fd) => {
            "use server";
            await addSponsor(slug, fd);
          }}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <label className="block sm:col-span-2">
            <span className="text-xs text-muted">Name</span>
            <input
              name="name"
              required
              placeholder="Island Grill"
              className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Category</span>
            <input
              name="category"
              placeholder="Jamaican restaurant"
              className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Location</span>
            <input
              name="location"
              placeholder="324 Bank St, Ottawa"
              className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-muted">Link (optional)</span>
            <input
              name="link"
              type="url"
              placeholder="https://example.com"
              className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Accent colour</span>
            <select
              name="accent"
              defaultValue="green"
              className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
            >
              <option value="green">Green</option>
              <option value="gold">Gold</option>
              <option value="red">Red</option>
              <option value="sun">Sun (orange)</option>
            </select>
          </label>
          <div className="flex items-end justify-end">
            <button
              type="submit"
              className="h-[38px] rounded-full bg-accent text-bg px-4 text-sm font-medium hover:opacity-90 transition"
            >
              Add sponsor
            </button>
          </div>
        </form>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {sponsors.length === 0 && (
          <li className="sm:col-span-2 rounded-2xl border border-line bg-bg-2 p-6 text-muted text-sm">
            No sponsors yet. Add your first above.
          </li>
        )}
        {sponsors.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-line bg-bg-2 p-5"
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-1 inline-block h-3 w-3 rounded-full shrink-0"
                style={{ background: ACCENT_DOT[s.accent] }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg truncate">{s.name}</p>
                {s.category && (
                  <p className="text-xs text-muted">{s.category}</p>
                )}
                {s.location && (
                  <p className="text-xs text-muted mt-1">{s.location}</p>
                )}
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-xs text-accent-2 truncate hover:underline"
                  >
                    {s.link}
                  </a>
                )}
              </div>
              <form
                action={async () => {
                  "use server";
                  await deleteSponsor(slug, s.id);
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-muted hover:text-red-400 transition"
                >
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
