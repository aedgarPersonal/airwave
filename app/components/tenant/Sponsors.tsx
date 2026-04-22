import type { Sponsor } from "@/app/lib/types";

const ACCENT_STYLE: Record<Sponsor["accent"], { border: string; bg: string }> = {
  green: {
    border: "color-mix(in srgb, var(--t-accent1) 40%, transparent)",
    bg: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent1) 40%, transparent), color-mix(in srgb, var(--t-accent1) 5%, transparent))",
  },
  gold: {
    border: "color-mix(in srgb, var(--t-accent2) 40%, transparent)",
    bg: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent2) 30%, transparent), color-mix(in srgb, var(--t-accent2) 5%, transparent))",
  },
  red: {
    border: "color-mix(in srgb, var(--t-accent3) 40%, transparent)",
    bg: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent3) 30%, transparent), color-mix(in srgb, var(--t-accent3) 5%, transparent))",
  },
  sun: {
    border: "color-mix(in srgb, #ff8a2b 40%, transparent)",
    bg: "linear-gradient(135deg, color-mix(in srgb, #ff8a2b 30%, transparent), color-mix(in srgb, #ff8a2b 5%, transparent))",
  },
};

export function Sponsors({ sponsors }: { sponsors: Sponsor[] }) {
  if (!sponsors.length) return null;
  return (
    <section id="sponsors" className="py-16 sm:py-24">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-display tracking-[0.3em]" style={{ color: "var(--t-accent3)" }}>
            COMMUNITY SPOTLIGHT
          </p>
          <h2 className="mt-2 text-4xl sm:text-5xl font-display">Local businesses</h2>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sponsors.map((s) => {
          const style = ACCENT_STYLE[s.accent];
          return (
            <a
              key={s.id}
              href={s.link || "#"}
              target={s.link ? "_blank" : undefined}
              rel={s.link ? "noopener noreferrer" : undefined}
              className="group block rounded-2xl border p-5 min-h-[200px] flex flex-col justify-between transition-transform hover:-translate-y-0.5"
              style={{ borderColor: style.border, background: style.bg }}
            >
              <div>
                <p className="text-xs font-display tracking-widest opacity-60">
                  {(s.category ?? "Local business").toUpperCase()}
                </p>
                <h3 className="mt-2 text-xl font-display leading-tight">{s.name}</h3>
                {s.location && (
                  <p className="mt-2 text-sm opacity-75 leading-snug">{s.location}</p>
                )}
              </div>
              {s.link && (
                <div className="mt-4 flex items-center justify-end">
                  <span className="text-sm font-medium group-hover:translate-x-0.5 transition-transform">
                    Visit →
                  </span>
                </div>
              )}
            </a>
          );
        })}
      </div>

      <p className="mt-6 text-xs opacity-40 max-w-2xl">
        Editorial feature, not paid placement. Verify hours and availability
        with each business directly.
      </p>
    </section>
  );
}
