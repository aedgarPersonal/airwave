import { notFound } from "next/navigation";
import { getOwnedStation } from "@/app/lib/auth";
import { saveContact } from "../actions";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getOwnedStation(slug);
  if (!station) notFound();
  const c = station.contact ?? {};

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display">Contact</h1>
      <p className="mt-1 text-muted text-sm">
        How listeners reach you live, on-air, or off-air. All fields optional;
        only what you fill in will render on the site.
      </p>

      <form action={saveContact.bind(null, slug)} className="mt-8 space-y-4">
        <Field name="landline" label="Landline" defaultValue={c.landline ?? ""} placeholder="613-699-0669" />
        <Field name="mobile" label="Call or text" defaultValue={c.mobile ?? ""} placeholder="613-265-3339" />
        <Field name="email" label="Email" type="email" defaultValue={c.email ?? ""} placeholder="hello@example.com" />
        <Field name="twitter" label="Twitter handle" defaultValue={c.twitter ?? ""} placeholder="RiddimWSM" hint="Without the @" />
        <Field name="facebookUrl" label="Facebook URL" type="url" defaultValue={c.facebookUrl ?? ""} placeholder="https://facebook.com/yourpage" />
        <Field name="instagramUrl" label="Instagram URL" type="url" defaultValue={c.instagramUrl ?? ""} placeholder="https://instagram.com/yourhandle" />

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
  type = "text",
  defaultValue,
  placeholder,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg bg-bg-2 border border-line px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
