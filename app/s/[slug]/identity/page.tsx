import { notFound } from "next/navigation";
import { getOwnedStation } from "@/app/lib/auth";
import { saveIdentity } from "../actions";

export default async function IdentityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getOwnedStation(slug);
  if (!station) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display">Identity</h1>
      <p className="mt-1 text-muted text-sm">
        The basics listeners see on your station page and on their home screen.
      </p>

      <form action={saveIdentity.bind(null, slug)} className="mt-8 space-y-5">
        <Field name="name" label="Station name" defaultValue={station.name} required />
        <Field
          name="tagline"
          label="Tagline"
          defaultValue={station.tagline ?? ""}
          hint="A short line that appears in the hero, e.g. “Caribbean sounds from the North”"
        />
        <Textarea
          name="description"
          label="Description"
          defaultValue={station.description ?? ""}
          hint="1–3 sentences about your station. Appears under the hero."
          rows={4}
        />
        <Field
          name="origin"
          label="Origin kicker"
          defaultValue={station.origin ?? ""}
          hint="Small text above the hero. E.g. “LIVE FROM THE 6IX TO THE WORLD”"
        />
        <Field
          name="timezone"
          label="Timezone"
          defaultValue={station.timezone}
          required
          hint="IANA timezone used for schedule calculations. E.g. America/Toronto, America/New_York."
        />
        <Field
          name="copyright_since"
          label="Copyright since"
          type="number"
          defaultValue={station.copyright_since?.toString() ?? ""}
          hint="Year shown in the footer (e.g. 2020). Leave blank to show only the current year."
        />

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

function Field({
  name,
  label,
  hint,
  type = "text",
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Textarea({
  name,
  label,
  hint,
  defaultValue,
  rows = 3,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent resize-y"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
