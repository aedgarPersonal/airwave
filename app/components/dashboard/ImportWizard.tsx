"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format12 } from "@/app/lib/current-show";
import type { StationDay, ThemeTokens } from "@/app/lib/types";

type ImportStation = {
  name: string;
  tagline: string | null;
  description: string | null;
  origin: string | null;
  stream_url: string | null;
  status_url: string | null;
};
type ImportContact = {
  landline?: string | null;
  mobile?: string | null;
  email?: string | null;
  twitter?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
};
type ImportDonate = {
  url?: string | null;
  label?: string | null;
  pitch?: string | null;
};
type ImportShow = {
  day: StationDay;
  start_min: number;
  end_min: number;
  title: string;
  host: string | null;
  crosses_midnight: boolean;
  confidence: "high" | "medium" | "low";
};
type ImportSponsor = {
  name: string;
  category: string | null;
  location: string | null;
  link: string | null;
  accent: "green" | "gold" | "red" | "sun";
  confidence: "high" | "medium" | "low";
};
type ImportResult = {
  source_url?: string;
  station?: ImportStation;
  contact?: ImportContact;
  donate?: ImportDonate;
  theme?: ThemeTokens & { rationale?: string };
  shows?: ImportShow[];
  sponsors?: ImportSponsor[];
  notes?: string[];
  error?: string;
  hint?: string;
};

const CONF: Record<ImportShow["confidence"], string> = {
  high: "bg-accent-2/20 text-accent-2",
  medium: "bg-amber-500/20 text-amber-300",
  low: "bg-red-500/20 text-red-300",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

type Step = "url" | "review" | "creating" | "done";

export function ImportWizard() {
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Editable drafts — the user can tweak anything before save.
  const [slug, setSlug] = useState("");
  const [station, setStation] = useState<ImportStation | null>(null);
  const [contact, setContact] = useState<ImportContact>({});
  const [donate, setDonate] = useState<ImportDonate>({});
  const [theme, setTheme] = useState<ThemeTokens | null>(null);
  const [shows, setShows] = useState<ImportShow[]>([]);
  const [sponsors, setSponsors] = useState<ImportSponsor[]>([]);
  const [showsSelected, setShowsSelected] = useState<Set<number>>(new Set());
  const [sponsorsSelected, setSponsorsSelected] = useState<Set<number>>(
    new Set(),
  );

  const router = useRouter();

  const runImport = async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/ai/import-station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = (await r.json()) as ImportResult;
      if (!r.ok) {
        setError(j.hint ?? j.error ?? "Import failed");
        return;
      }
      setResult(j);
      if (j.station) {
        setStation(j.station);
        setSlug(slugify(j.station.name));
      }
      if (j.contact) setContact(j.contact);
      if (j.donate) setDonate(j.donate);
      if (j.theme) setTheme(j.theme);
      if (j.shows) {
        setShows(j.shows);
        setShowsSelected(new Set(j.shows.map((_, i) => i)));
      }
      if (j.sponsors) {
        setSponsors(j.sponsors);
        setSponsorsSelected(new Set(j.sponsors.map((_, i) => i)));
      }
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const createStation = async () => {
    if (!station || !slug) return;
    setError(null);
    setStep("creating");
    try {
      const r = await fetch("/api/admin/stations/from-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          station: {
            ...station,
            stream_url: station.stream_url ?? "",
            status_url: station.status_url,
          },
          contact,
          donate,
          theme,
          shows: shows
            .filter((_, i) => showsSelected.has(i))
            .map(({ confidence: _c, ...rest }) => rest),
          sponsors: sponsors
            .filter((_, i) => sponsorsSelected.has(i))
            .map(({ confidence: _c, ...rest }) => rest),
        }),
      });
      const j = (await r.json()) as { slug?: string; error?: string; hint?: string };
      if (!r.ok) {
        setError(j.hint ?? j.error ?? "Save failed");
        setStep("review");
        return;
      }
      setStep("done");
      router.push(`/s/${j.slug}/identity`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setStep("review");
    }
  };

  if (step === "url") {
    return (
      <div className="rounded-2xl border border-line bg-bg-2 p-6">
        <label className="block">
          <span className="text-sm font-medium">
            Your station&apos;s current website
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://riddimwsm.com"
            className="mt-2 w-full rounded-lg bg-bg border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          <span className="mt-1.5 block text-xs text-muted">
            Pointing at a sub-page with schedule or sponsors gives better
            results than a splash page. JavaScript-rendered single-page
            apps may return empty — in that case fall back to manual setup.
          </span>
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={runImport}
            disabled={loading || !url}
            className="rounded-full bg-accent text-bg px-5 py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Importing…" : "Import with AI →"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "review" && station) {
    return (
      <div className="space-y-8">
        {result?.notes && result.notes.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">
            <p className="font-display tracking-widest text-[10px] mb-2">
              AI NOTES
            </p>
            <ul className="space-y-1">
              {result.notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Station basics */}
        <section className="rounded-2xl border border-line bg-bg-2 p-6">
          <h2 className="font-display text-lg">Station basics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              value={station.name}
              onChange={(v) => {
                setStation({ ...station, name: v });
                setSlug(slugify(v));
              }}
              required
            />
            <Field
              label="Slug"
              value={slug}
              onChange={setSlug}
              required
              hint={`Mobile URL: ${slug || "…"}.airwave.io`}
            />
            <Field
              label="Tagline"
              value={station.tagline ?? ""}
              onChange={(v) => setStation({ ...station, tagline: v || null })}
              full
            />
            <Field
              label="Origin kicker"
              value={station.origin ?? ""}
              onChange={(v) => setStation({ ...station, origin: v || null })}
              full
            />
            <Field
              label="Stream URL"
              value={station.stream_url ?? ""}
              onChange={(v) =>
                setStation({ ...station, stream_url: v || null })
              }
              full
              required
              hint="HTTPS only. Ask your host for the HTTPS variant if you only have HTTP."
            />
            <Field
              label="Status URL (optional)"
              value={station.status_url ?? ""}
              onChange={(v) =>
                setStation({ ...station, status_url: v || null })
              }
              full
              hint="Icecast status-json.xsl endpoint for now-playing metadata."
            />
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={station.description ?? ""}
                onChange={(e) =>
                  setStation({
                    ...station,
                    description: e.target.value || null,
                  })
                }
                rows={3}
                className="mt-1.5 w-full rounded-lg bg-bg border border-line px-3 py-2 text-sm outline-none focus:border-accent resize-y"
              />
            </label>
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl border border-line bg-bg-2 p-6">
          <h2 className="font-display text-lg">Contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["landline", "Landline"],
                ["mobile", "Call or text"],
                ["email", "Email"],
                ["twitter", "Twitter handle"],
                ["facebookUrl", "Facebook URL"],
                ["instagramUrl", "Instagram URL"],
              ] as const
            ).map(([k, label]) => (
              <Field
                key={k}
                label={label}
                value={(contact[k] as string | null) ?? ""}
                onChange={(v) => setContact({ ...contact, [k]: v || null })}
              />
            ))}
          </div>
        </section>

        {/* Donate */}
        <section className="rounded-2xl border border-line bg-bg-2 p-6">
          <h2 className="font-display text-lg">Donations</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Donate URL"
              value={donate.url ?? ""}
              onChange={(v) => setDonate({ ...donate, url: v || null })}
            />
            <Field
              label="Button label"
              value={donate.label ?? ""}
              onChange={(v) => setDonate({ ...donate, label: v || null })}
            />
          </div>
        </section>

        {/* Theme */}
        {theme && (
          <section className="rounded-2xl border border-line bg-bg-2 p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="font-display text-lg">Theme</h2>
              {"rationale" in theme && typeof theme.rationale === "string" && (
                <p className="text-xs text-muted italic max-w-md text-right">
                  {theme.rationale}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {(["ink", "ink2", "cream", "accent1", "accent2", "accent3"] as const).map(
                (k) => (
                  <div key={k} className="flex items-center gap-2">
                    <span
                      className="inline-block h-7 w-7 rounded border border-line"
                      style={{ background: theme[k] }}
                    />
                    <span className="text-xs">
                      <span className="text-muted block">{k}</span>
                      <input
                        type="text"
                        value={theme[k]}
                        onChange={(e) =>
                          setTheme({ ...theme, [k]: e.target.value })
                        }
                        className="w-20 bg-bg border border-line rounded px-1 py-0.5 font-mono text-xs outline-none focus:border-accent"
                      />
                    </span>
                  </div>
                ),
              )}
            </div>
            <div
              className="mt-5 rounded-lg p-5"
              style={{ background: theme.ink, color: theme.cream }}
            >
              <p
                className="text-xs font-display tracking-widest"
                style={{ color: theme.accent2 }}
              >
                LIVE PREVIEW
              </p>
              <p className="mt-2 font-display text-2xl">
                {station.tagline ?? station.name}
              </p>
              <button
                type="button"
                className="mt-3 rounded-full px-4 py-1.5 text-xs font-medium"
                style={{ background: theme.accent2, color: theme.ink }}
              >
                {donate.label ?? "Donate"}
              </button>
            </div>
          </section>
        )}

        {/* Shows */}
        <section className="rounded-2xl border border-line bg-bg-2 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-display text-lg">
              Schedule{" "}
              <span className="text-sm text-muted font-sans">
                ({showsSelected.size} of {shows.length})
              </span>
            </h2>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setShowsSelected(new Set(shows.map((_, i) => i)))
                }
                className="text-muted hover:text-fg"
              >
                All
              </button>
              <span className="text-muted">/</span>
              <button
                type="button"
                onClick={() => setShowsSelected(new Set())}
                className="text-muted hover:text-fg"
              >
                None
              </button>
            </div>
          </div>
          {shows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No schedule detected on the page. You can add shows from the
              dashboard after setup.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
              {shows.map((s, i) => (
                <li
                  key={i}
                  className="px-3 py-2.5 flex items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={showsSelected.has(i)}
                    onChange={() => {
                      setShowsSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(i)) n.delete(i);
                        else n.add(i);
                        return n;
                      });
                    }}
                    className="accent-accent"
                  />
                  <span className="text-xs font-display tracking-widest text-accent-2 w-12">
                    {s.day}
                  </span>
                  <span className="text-xs font-mono text-muted w-36">
                    {format12(s.start_min)}–{format12(s.end_min)}
                  </span>
                  <span className="flex-1 min-w-0 truncate">
                    <span className="font-display">{s.title}</span>
                    {s.host && (
                      <span className="text-muted"> · with {s.host}</span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-display tracking-widest px-2 py-0.5 rounded ${CONF[s.confidence]}`}
                  >
                    {s.confidence.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sponsors */}
        <section className="rounded-2xl border border-line bg-bg-2 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-display text-lg">
              Community Spotlight{" "}
              <span className="text-sm text-muted font-sans">
                ({sponsorsSelected.size} of {sponsors.length})
              </span>
            </h2>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setSponsorsSelected(new Set(sponsors.map((_, i) => i)))
                }
                className="text-muted hover:text-fg"
              >
                All
              </button>
              <span className="text-muted">/</span>
              <button
                type="button"
                onClick={() => setSponsorsSelected(new Set())}
                className="text-muted hover:text-fg"
              >
                None
              </button>
            </div>
          </div>
          {sponsors.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No sponsors detected on this page. Point us at your partners /
              sponsors page from the Spotlight tab later.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
              {sponsors.map((s, i) => (
                <li key={i} className="px-3 py-3 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={sponsorsSelected.has(i)}
                    onChange={() => {
                      setSponsorsSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(i)) n.delete(i);
                        else n.add(i);
                        return n;
                      });
                    }}
                    className="mt-1 accent-accent"
                  />
                  <span className="flex-1 min-w-0">
                    <p className="font-display truncate">{s.name}</p>
                    {s.category && (
                      <p className="text-xs text-muted truncate">{s.category}</p>
                    )}
                    {s.location && (
                      <p className="text-xs text-muted truncate">{s.location}</p>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-display tracking-widest px-2 py-0.5 rounded shrink-0 ${CONF[s.confidence]}`}
                  >
                    {s.confidence.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setStep("url")}
            className="text-sm text-muted hover:text-fg"
          >
            ← Try another URL
          </button>
          <button
            type="button"
            onClick={createStation}
            disabled={!station.name || !station.stream_url || !slug}
            className="rounded-full bg-accent text-bg px-6 py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            Create station &amp; enter dashboard →
          </button>
        </div>
      </div>
    );
  }

  if (step === "creating") {
    return (
      <div className="rounded-2xl border border-line bg-bg-2 p-10 text-center">
        <div className="inline-block h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-muted">Creating your station…</p>
      </div>
    );
  }

  return null;
}

function Field({
  label,
  value,
  onChange,
  hint,
  required,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg bg-bg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
