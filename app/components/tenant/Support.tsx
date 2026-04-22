import type { DonateJson } from "@/app/lib/types";

export function Support({
  donate,
  stationName,
}: {
  donate: DonateJson;
  stationName: string;
}) {
  if (!donate.url) return null;
  const pitch =
    donate.pitch ??
    `${stationName} is independent and listener-supported. Keep the station alive.`;
  return (
    <section id="support" className="py-16 sm:py-24 border-t border-white/10">
      <div
        className="relative overflow-hidden rounded-3xl border p-8 sm:p-12"
        style={{
          borderColor: "color-mix(in srgb, var(--t-accent2) 40%, transparent)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--t-accent2) 15%, transparent), color-mix(in srgb, var(--t-accent3) 10%, transparent))",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1 flag-stripes" aria-hidden />
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr] items-center">
          <div>
            <p className="text-sm font-display tracking-[0.3em]" style={{ color: "var(--t-accent2)" }}>
              SUPPORT THE STATION
            </p>
            <h2 className="mt-2 text-4xl sm:text-5xl font-display">
              Keep the station on the air.
            </h2>
            <p className="mt-4 opacity-80 leading-relaxed max-w-xl">{pitch}</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <a
              href={donate.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold shadow-lg transition-colors"
              style={{
                background: "var(--t-accent2)",
                color: "var(--t-ink)",
              }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 21s-7.5-4.5-9.5-9.1C1.2 8.8 2.8 5 6.2 5c2 0 3.4 1.1 4.3 2.7h3c.9-1.6 2.3-2.7 4.3-2.7 3.4 0 5 3.8 3.7 6.9C19.5 16.5 12 21 12 21Z" />
              </svg>
              {donate.label ?? "Donate"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
