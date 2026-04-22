import { notFound } from "next/navigation";
import { getAdminStation } from "@/app/lib/stations";
import { getOwnedStation } from "@/app/lib/auth";
import { addShow, deleteShow } from "../actions";
import { format12 } from "@/app/lib/current-show";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Daily"] as const;

function minutesToInput(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Auth check via owned lookup, data via admin lookup.
  if (!(await getOwnedStation(slug))) notFound();
  const admin = await getAdminStation(slug);
  if (!admin) notFound();
  const { shows } = admin;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-display">Schedule</h1>
      <p className="mt-1 text-muted text-sm">
        Times are interpreted in your station&apos;s timezone. For overnight
        shows, tick &ldquo;crosses midnight&rdquo; — we&apos;ll handle the rest.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-bg-2 p-5">
        <p className="text-xs font-display tracking-widest text-muted">
          ADD A SHOW
        </p>
        <form
          action={async (formData) => {
            "use server";
            await addShow(slug, formData);
          }}
          className="mt-4 grid gap-3 sm:grid-cols-[120px_120px_120px_1fr_1fr_auto] items-end"
        >
          <label className="block">
            <span className="text-xs text-muted">Day</span>
            <select
              name="day"
              className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
              defaultValue="Mon"
            >
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <TimeField name="start_min" label="Start" />
          <TimeField name="end_min" label="End" />
          <label className="block">
            <span className="text-xs text-muted">Title</span>
            <input
              name="title"
              required
              placeholder="Gospel Sundays"
              className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Host</span>
            <input
              name="host"
              placeholder="Wally B"
              className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="h-[38px] rounded-full bg-accent text-bg px-4 text-sm font-medium hover:opacity-90 transition"
          >
            Add
          </button>
          <label className="sm:col-span-6 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              name="crosses_midnight"
              className="accent-accent"
            />
            Crosses midnight (end time is in the next day)
          </label>
        </form>
      </div>

      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-bg-2">
        {shows.length === 0 && (
          <li className="p-6 text-muted text-sm">
            No shows yet. Add your first show above.
          </li>
        )}
        {shows.map((s) => (
          <li
            key={s.id}
            className="p-4 grid gap-2 sm:grid-cols-[90px_110px_1fr_auto] sm:items-center"
          >
            <span className="text-xs font-display tracking-widest text-accent-2">
              {s.day}
            </span>
            <span className="text-xs font-mono text-muted">
              {format12(s.start_min)}–{format12(s.end_min)}
              {s.crosses_midnight && <span className="ml-1 opacity-60">(late)</span>}
            </span>
            <span>
              <span className="font-display text-lg">{s.title}</span>
              {s.host && (
                <span className="ml-2 text-sm text-muted">with {s.host}</span>
              )}
            </span>
            <form
              action={async () => {
                "use server";
                await deleteShow(slug, s.id);
              }}
            >
              <button
                type="submit"
                className="text-xs text-muted hover:text-red-400 transition"
              >
                Delete
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimeField({ name, label }: { name: string; label: string }) {
  // HTML time inputs give HH:MM strings. We transform to minutes in the action.
  // Supabase schema stores minutes-since-midnight as int. For form submit we
  // need a hidden field or to read the time input and convert. Simpler: use a
  // type="time" input and convert here via a controlled client component.
  // For the MVP, accept HH:MM via a text pattern and let the action parse.
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <TimeInput name={name} />
    </label>
  );
}

// Inline client component to turn HH:MM into minutes-since-midnight before
// the form is submitted to the server action.
function TimeInput({ name }: { name: string }) {
  return (
    <input
      name={name}
      type="time"
      required
      defaultValue="18:00"
      className="mt-1 w-full rounded-lg bg-bg border border-line px-2 py-2 text-sm"
    />
  );
}
