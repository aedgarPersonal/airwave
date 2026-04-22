import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveHostToSlug, getPublicStation } from "@/app/lib/stations";
import { Player } from "@/app/components/tenant/Player";
import { Schedule } from "@/app/components/tenant/Schedule";
import { Sponsors } from "@/app/components/tenant/Sponsors";
import { Contact } from "@/app/components/tenant/Contact";
import { Support } from "@/app/components/tenant/Support";
import { InstallPrompt } from "@/app/components/tenant/InstallPrompt";
import type { ThemeTokens } from "@/app/lib/types";
import { DEFAULT_THEME } from "@/app/lib/types";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";

type RouteParams = { host: string };

// Per-station metadata: title, description, OG, theme-color, and the
// apple-touch-icon link so iOS installs show the station's logo.
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { host } = await params;
  const slug = await resolveHostToSlug(decodeURIComponent(host), ROOT);
  if (!slug) return { title: "Airwave" };
  const data = await getPublicStation(slug);
  if (!data) return { title: "Airwave" };
  const { station } = data;
  const title = station.tagline
    ? `${station.name} — ${station.tagline}`
    : station.name;
  const description =
    station.description ?? `${station.name} — tune in live.`;
  const themeColor = station.theme_tokens?.accent1 ?? "#009b3a";
  const ogImage = station.logo_url ?? undefined;

  return {
    title,
    description,
    applicationName: station.name,
    appleWebApp: {
      capable: true,
      title: station.name,
      statusBarStyle: "black-translucent",
    },
    icons: ogImage
      ? {
          icon: ogImage,
          apple: ogImage,
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage ? [ogImage] : undefined,
    },
    other: {
      "theme-color": themeColor,
    },
  };
}

export default async function TenantPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { host } = await params;
  const slug = await resolveHostToSlug(decodeURIComponent(host), ROOT);
  if (!slug) notFound();
  const data = await getPublicStation(slug);
  if (!data) notFound();
  const { station, shows, sponsors } = data;
  const theme = (station.theme_tokens ?? DEFAULT_THEME) as ThemeTokens;

  return (
    <div
      data-theme="tenant"
      className="flex-1"
      style={themeStyle(theme)}
    >
      <header className="relative overflow-hidden caribbean-gradient">
        <div
          className="absolute inset-x-0 top-0 h-1 flag-stripes"
          aria-hidden
        />
        <nav className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-6 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            {station.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={station.logo_url}
                alt={station.name}
                className="h-9 w-9 rounded-lg"
              />
            ) : (
              <span
                className="inline-flex h-9 px-2 items-center justify-center rounded-lg font-display text-base tracking-widest"
                style={{
                  background: "var(--t-accent2)",
                  color: "var(--t-ink)",
                }}
              >
                {station.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 3)
                  .join("")
                  .toUpperCase()}
              </span>
            )}
            <span className="font-display text-xl tracking-wider">
              {station.name}
            </span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm opacity-80">
            {shows.length > 0 && (
              <a href="#schedule" className="hover:opacity-100 transition">
                Schedule
              </a>
            )}
            {sponsors.length > 0 && (
              <a href="#sponsors" className="hover:opacity-100 transition">
                Spotlight
              </a>
            )}
            <a href="#contact" className="hover:opacity-100 transition">
              Contact
            </a>
            <InstallPrompt
              slug={station.slug}
              stationName={station.name}
              asButton
            />
            {station.donate?.url && (
              <a
                href={station.donate.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-4 py-1.5 font-medium transition-colors"
                style={{
                  background: "var(--t-accent2)",
                  color: "var(--t-ink)",
                }}
              >
                {station.donate.label ?? "Donate"}
              </a>
            )}
          </div>
        </nav>

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-14 pb-16 sm:pt-24 sm:pb-24 grid gap-10 lg:grid-cols-[1.2fr_1fr] items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-display tracking-[0.3em]" style={{ color: "var(--t-accent2)" }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--t-accent3)" }} />
              {station.origin ?? "LIVE WORLDWIDE"}
            </p>
            <h1 className="mt-5 font-display text-6xl sm:text-7xl lg:text-8xl leading-[0.95]">
              {station.tagline ?? station.name}
            </h1>
            {station.description && (
              <p className="mt-6 max-w-xl text-lg opacity-75 leading-relaxed">
                {station.description}
              </p>
            )}
          </div>

          <Player station={station} shows={shows} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <Schedule shows={shows} />
        <Sponsors sponsors={sponsors} />
        <Support donate={station.donate} stationName={station.name} />
        <Contact contact={station.contact} />
      </main>

      <footer className="mt-20 border-t border-white/10">
        <div className="h-1 flag-stripes" aria-hidden />
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 text-sm opacity-60 space-y-1">
          <div>
            Copyright ©{" "}
            {station.copyright_since
              ? `${station.copyright_since}–${new Date().getFullYear()}`
              : new Date().getFullYear()}{" "}
            {station.name}. All rights reserved.
          </div>
          <div className="text-xs opacity-40 italic">
            The views expressed by the hosts of the various shows are not
            necessarily the views of {station.name}.
          </div>
          <div className="pt-4 text-xs opacity-40">
            Powered by{" "}
            <a href={`https://${ROOT}`} className="underline hover:opacity-60">
              Airwave
            </a>
          </div>
        </div>
      </footer>

      <InstallPrompt slug={station.slug} stationName={station.name} />
    </div>
  );
}

function themeStyle(t: ThemeTokens): React.CSSProperties {
  return {
    // Next-level-agnostic custom CSS props. The `data-theme="tenant"` selector
    // uses these with fallbacks.
    ["--t-ink" as string]: t.ink,
    ["--t-ink-2" as string]: t.ink2,
    ["--t-cream" as string]: t.cream,
    ["--t-accent1" as string]: t.accent1,
    ["--t-accent2" as string]: t.accent2,
    ["--t-accent3" as string]: t.accent3,
  };
}
