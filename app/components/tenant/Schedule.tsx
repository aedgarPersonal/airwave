import type { Show, StationDay } from "@/app/lib/types";
import { format12 } from "@/app/lib/current-show";

const DAY_ORDER: StationDay[] = [
  "Daily",
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];
const DAY_FULL: Record<StationDay, string> = {
  Daily: "Every Day",
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

export function Schedule({ shows }: { shows: Show[] }) {
  if (!shows.length) return null;
  const grouped = new Map<StationDay, Show[]>();
  for (const d of DAY_ORDER) grouped.set(d, []);
  for (const s of shows) grouped.get(s.day)?.push(s);
  for (const list of grouped.values())
    list.sort((a, b) => a.start_min - b.start_min || a.display_order - b.display_order);
  const entries = [...grouped.entries()].filter(([, v]) => v.length);

  return (
    <section id="schedule" className="py-16 sm:py-24">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-display tracking-[0.3em]" style={{ color: "var(--t-accent2)" }}>
            THE WEEK AHEAD
          </p>
          <h2 className="mt-2 text-4xl sm:text-5xl font-display">Shows &amp; selectors</h2>
        </div>
        <p className="opacity-60 max-w-md">
          Between live shows the autoDJ keeps the riddim rolling 24/7.
        </p>
      </div>

      <div className="mt-10 space-y-8">
        {entries.map(([day, list]) => (
          <div
            key={day}
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "color-mix(in srgb, var(--t-ink-2) 60%, transparent)" }}
          >
            <div className="px-5 sm:px-6 py-3 border-b border-white/10 flex items-center gap-3">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: "var(--t-accent1)" }}
              />
              <h3 className="font-display text-xl tracking-widest">{DAY_FULL[day]}</h3>
            </div>
            <ul className="divide-y divide-white/5">
              {list.map((s) => (
                <li
                  key={s.id}
                  className="px-5 sm:px-6 py-4 grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-center"
                >
                  <div className="text-sm font-mono" style={{ color: "var(--t-accent2)" }}>
                    {format12(s.start_min)} – {format12(s.end_min)}
                    {s.crosses_midnight && (
                      <span className="ml-2 text-[10px] uppercase tracking-widest opacity-50">
                        late
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-display text-2xl leading-tight">{s.title}</p>
                    {s.host && (
                      <p className="text-sm opacity-60 mt-0.5">with {s.host}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
