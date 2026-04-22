import Link from "next/link";
import { createStation } from "../actions";

export default function ManualStationPage() {
  return (
    <div className="flex-1">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <Link href="/dashboard/new" className="text-sm text-muted hover:text-fg">
            ← Back to import
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-display">Add a station manually</h1>
        <p className="mt-2 text-muted text-sm">
          Fill in the basics — you&apos;ll flesh out the schedule, sponsors,
          and theme in the dashboard. The slug becomes your mobile URL:
          <code className="mx-1 px-1.5 py-0.5 rounded bg-bg-3 text-xs">
            [slug].airwave.io
          </code>
          .
        </p>

        <form action={createStation} className="mt-8 space-y-5">
          <Field name="name" label="Station name" placeholder="Riddim WSM" required />
          <Field
            name="slug"
            label="Slug"
            placeholder="riddimwsm"
            pattern="[a-z0-9-]{2,40}"
            required
            hint="Lowercase letters, numbers, and dashes."
          />
          <Field
            name="tagline"
            label="Tagline (optional)"
            placeholder="Caribbean sounds from the North"
          />
          <Field
            name="stream_url"
            label="Stream URL"
            placeholder="https://riddimwsm.radioca.st/stream"
            type="url"
            required
          />
          <Field
            name="status_url"
            label="Icecast status URL (optional)"
            placeholder="https://riddimwsm.radioca.st/status-json.xsl"
            type="url"
          />

          <div className="pt-2 flex items-center justify-end gap-3">
            <Link href="/dashboard" className="text-sm text-muted hover:text-fg px-4 py-2">
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-full bg-accent text-bg px-5 py-2.5 font-medium hover:opacity-90 transition"
            >
              Create station
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  name,
  label,
  hint,
  type = "text",
  ...rest
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  pattern?: string;
  title?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-fg">{label}</span>
      <input
        name={name}
        type={type}
        {...rest}
        className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
