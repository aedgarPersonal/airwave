import { notFound } from "next/navigation";
import { getOwnedStation } from "@/app/lib/auth";
import { saveDonate } from "../actions";

export default async function DonatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getOwnedStation(slug);
  if (!station) notFound();
  const d = station.donate ?? {};

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display">Donations</h1>
      <p className="mt-1 text-muted text-sm">
        Point the Donate button at any URL — Ko-fi, Stripe Payment Link,
        PayPal, CanadaHelps, etc. Leave empty to hide the button entirely.
      </p>

      <form action={saveDonate.bind(null, slug)} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Donate URL</span>
          <input
            name="url"
            type="url"
            defaultValue={d.url ?? ""}
            placeholder="https://ko-fi.com/yourstation"
            className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <span className="mt-1 block text-xs text-muted">
            Tip: Ko-fi has the lowest fees for small stations; Stripe Payment
            Links give you subscriptions if you want monthly supporters.
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Button label</span>
          <input
            name="label"
            defaultValue={d.label ?? "Donate"}
            className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Pitch</span>
          <textarea
            name="pitch"
            defaultValue={d.pitch ?? ""}
            rows={3}
            placeholder="Your station is listener-supported. Keep the signal strong."
            className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent resize-y"
          />
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
