import { notFound } from "next/navigation";
import { getPublicStation } from "@/app/lib/stations";
import { Player } from "@/app/components/tenant/Player";
import { Schedule } from "@/app/components/tenant/Schedule";
import { Sponsors } from "@/app/components/tenant/Sponsors";
import { Support } from "@/app/components/tenant/Support";
import { Contact } from "@/app/components/tenant/Contact";
import { IframeResize } from "@/app/components/tenant/IframeResize";
import { DEFAULT_THEME } from "@/app/lib/types";
import type { ThemeTokens } from "@/app/lib/types";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicStation(slug);
  if (!data) notFound();
  const { station, shows, sponsors } = data;
  const theme = (station.theme_tokens ?? DEFAULT_THEME) as ThemeTokens;
  const installUrl = `https://${slug}.${ROOT}`;

  return (
    <div data-theme="tenant" style={themeStyle(theme)}>
      <IframeResize slug={slug} />
      <div className="caribbean-gradient px-5 sm:px-8 py-10 sm:py-14 rounded-t-3xl">
        <p
          className="text-xs font-display tracking-[0.3em]"
          style={{ color: "var(--t-accent2)" }}
        >
          {station.origin ?? "LIVE"}
        </p>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl leading-[1]">
          {station.tagline ?? station.name}
        </h2>
        <div className="mt-6">
          <Player station={station} shows={shows} />
        </div>
      </div>

      <div className="px-5 sm:px-8">
        <Schedule shows={shows} />
        <Sponsors sponsors={sponsors} />
        <Support donate={station.donate} stationName={station.name} />
        <Contact contact={station.contact} />
      </div>

      <div className="px-5 sm:px-8 py-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs opacity-70">
        <a
          href={installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full px-4 py-2 font-medium transition-colors"
          style={{
            background: "var(--t-accent2)",
            color: "var(--t-ink)",
          }}
        >
          📱 Get the app →
        </a>
        <span>
          Powered by{" "}
          <a
            href={`https://${ROOT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Airwave
          </a>
        </span>
      </div>
    </div>
  );
}

function themeStyle(t: ThemeTokens): React.CSSProperties {
  return {
    ["--t-ink" as string]: t.ink,
    ["--t-ink-2" as string]: t.ink2,
    ["--t-cream" as string]: t.cream,
    ["--t-accent1" as string]: t.accent1,
    ["--t-accent2" as string]: t.accent2,
    ["--t-accent3" as string]: t.accent3,
  };
}
