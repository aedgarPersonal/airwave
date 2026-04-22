import type { Show, StationDay } from "@/app/lib/types";

const DAY_ORDER: StationDay[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];
type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

function nextDay(d: Weekday): Weekday {
  return DAY_ORDER[(DAY_ORDER.indexOf(d) + 1) % 7] as Weekday;
}

// Convert `now` (usually the browser's local Date) to the station's timezone.
export function toZonedDayMinutes(now: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value as Weekday;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const h = hour === 24 ? 0 : hour;
  return { day: weekday, minutes: h * 60 + minute };
}

type Window = { day: Weekday | "Daily"; start: number; end: number };

function windowsFor(show: Show): Window[] {
  if (show.day === "Daily") {
    return [
      {
        day: "Daily",
        start: show.start_min,
        end: show.end_min <= show.start_min ? 1440 : show.end_min,
      },
    ];
  }
  const day = show.day as Weekday;
  if (show.crosses_midnight || show.end_min <= show.start_min) {
    return [
      { day, start: show.start_min, end: 1440 },
      { day: nextDay(day), start: 0, end: show.end_min },
    ];
  }
  return [{ day, start: show.start_min, end: show.end_min }];
}

export function currentShow(
  shows: Show[],
  timezone: string,
  now: Date = new Date(),
): Show | null {
  const { day, minutes } = toZonedDayMinutes(now, timezone);
  const matches: { show: Show; start: number }[] = [];
  for (const show of shows) {
    for (const w of windowsFor(show)) {
      const dayOk = w.day === "Daily" || w.day === day;
      if (dayOk && minutes >= w.start && minutes < w.end) {
        matches.push({ show, start: show.start_min });
        break;
      }
    }
  }
  if (!matches.length) return null;
  matches.sort((a, b) => b.start - a.start);
  return matches[0].show;
}

export function format12(startOrEnd: number) {
  const h = Math.floor(startOrEnd / 60);
  const m = startOrEnd % 60;
  if (h === 0 && m === 0) return "12 AM";
  const period = h >= 12 ? "PM" : "AM";
  const hr = ((h + 11) % 12) + 1;
  return m === 0
    ? `${hr} ${period}`
    : `${hr}:${m.toString().padStart(2, "0")} ${period}`;
}
