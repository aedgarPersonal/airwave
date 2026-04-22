import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { listOwnedStations } from "@/app/lib/auth";

export default async function DashboardPage() {
  const stations = await listOwnedStations();

  return (
    <div className="flex-1">
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 px-2 items-center justify-center rounded-md bg-accent text-bg font-display tracking-widest text-sm">
              AIRWAVE
            </span>
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display">Your stations</h1>
            <p className="mt-1 text-muted text-sm">
              Each station is a separate tenant with its own schedule, theme,
              embed, and mobile page.
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="rounded-full bg-accent text-bg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            + Add a station
          </Link>
        </div>

        {stations.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-line bg-bg-2 p-10 text-center">
            <p className="font-display text-2xl">No stations yet</p>
            <p className="mt-2 text-muted">
              Add your first station to get started. The import wizard will try
              to pull in your schedule, sponsors, and brand from an existing URL.
            </p>
            <Link
              href="/dashboard/new"
              className="mt-6 inline-flex rounded-full bg-accent text-bg px-5 py-2.5 font-medium hover:opacity-90 transition"
            >
              Add your first station
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {stations.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/s/${s.slug}/identity`}
                  className="block rounded-2xl border border-line bg-bg-2 p-5 hover:bg-bg-3 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl truncate">{s.name}</p>
                      <p className="mt-0.5 text-xs text-muted truncate">
                        {s.slug}.airwave.io
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-display tracking-widest px-2 py-0.5 rounded ${s.published ? "bg-accent-2/20 text-accent-2" : "bg-white/10 text-muted"}`}
                    >
                      {s.published ? "LIVE" : "DRAFT"}
                    </span>
                  </div>
                  {s.tagline && (
                    <p className="mt-3 text-sm text-muted line-clamp-2">
                      {s.tagline}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
