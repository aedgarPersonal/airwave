import Link from "next/link";
import { notFound } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getOwnedStation } from "@/app/lib/auth";

const TABS = [
  { id: "identity", label: "Identity" },
  { id: "stream", label: "Stream" },
  { id: "schedule", label: "Schedule" },
  { id: "sponsors", label: "Spotlight" },
  { id: "contact", label: "Contact" },
  { id: "donate", label: "Donate" },
  { id: "embed", label: "Embed" },
  { id: "publish", label: "Publish" },
];

export default async function StationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getOwnedStation(slug);
  if (!station) notFound();
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-fg transition"
          >
            ← All stations
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg truncate">{station.name}</p>
            <p className="text-xs text-muted truncate">
              {station.published ? "Live at " : "Draft — will publish to "}
              <a
                href={`https://${station.slug}.${root}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-fg"
              >
                {station.slug}.{root}
              </a>
            </p>
          </div>
          <span
            className={`text-[10px] font-display tracking-widest px-2 py-0.5 rounded ${station.published ? "bg-accent-2/20 text-accent-2" : "bg-white/10 text-muted"}`}
          >
            {station.published ? "LIVE" : "DRAFT"}
          </span>
          <UserButton />
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <nav className="flex gap-1 overflow-x-auto -mb-px">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={`/s/${slug}/${t.id}`}
                className="px-4 py-2.5 text-sm border-b-2 border-transparent hover:text-fg hover:border-line transition whitespace-nowrap"
                // Actively-highlighted tab is tricky in server components
                // without reading the segment; defer to client route-aware
                // CSS on the page itself if we want precise styling.
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
