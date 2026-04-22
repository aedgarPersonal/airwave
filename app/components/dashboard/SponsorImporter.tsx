"use client";

import { useState } from "react";

type ParsedSponsor = {
  name: string;
  category: string | null;
  location: string | null;
  link: string | null;
  accent: "green" | "gold" | "red" | "sun";
  confidence: "high" | "medium" | "low";
};

type ParseResponse = {
  sponsors?: ParsedSponsor[];
  notes?: string[];
  error?: string;
  hint?: string;
};

const CONF_STYLE: Record<ParsedSponsor["confidence"], string> = {
  high: "bg-accent-2/20 text-accent-2",
  medium: "bg-amber-500/20 text-amber-300",
  low: "bg-red-500/20 text-red-300",
};
const ACCENT_DOT: Record<string, string> = {
  green: "#009b3a",
  gold: "#fed100",
  red: "#e1403b",
  sun: "#ff8a2b",
};

export function SponsorImporter({ slug }: { slug: string }) {
  const [url, setUrl] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [parsed, setParsed] = useState<ParsedSponsor[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const runParse = async () => {
    setLoading(true);
    setResult(null);
    setParsed([]);
    setSelected(new Set());
    setSaveMsg(null);
    try {
      const r = await fetch("/api/ai/parse-sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, url, hint: hint || undefined }),
      });
      const j = (await r.json()) as ParseResponse;
      setResult(j);
      if (j.sponsors) {
        setParsed(j.sponsors);
        setSelected(new Set(j.sponsors.map((_, i) => i)));
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const saveSelected = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch(`/api/admin/stations/${slug}/sponsors/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsors: parsed.filter((_, i) => selected.has(i)),
        }),
      });
      const j = (await r.json()) as { inserted?: number; error?: string };
      if (!r.ok) throw new Error(j.error ?? "save_failed");
      setSaveMsg(
        `Added ${j.inserted} sponsor${j.inserted === 1 ? "" : "s"}.`,
      );
      setParsed([]);
      setSelected(new Set());
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-bg-2 p-5">
      <p className="text-xs font-display tracking-widest text-accent-2">
        ✨ AI IMPORT FROM URL
      </p>
      <p className="mt-1 text-sm">
        Point AI at your current sponsors / partners page and it&apos;ll
        extract the businesses for you to review.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-station.com/sponsors"
          className="rounded-lg bg-bg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={runParse}
          disabled={loading || !url}
          className="rounded-full bg-accent text-bg px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Parsing…" : "Parse URL"}
        </button>
      </div>
      <input
        type="text"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder="Optional hint — e.g. 'sponsors are in the footer grid'"
        className="mt-2 w-full rounded-lg bg-bg border border-line px-3 py-2 text-xs outline-none focus:border-accent"
      />

      {result?.error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {result.hint ?? result.error}
        </div>
      )}

      {parsed.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Found <strong>{parsed.length}</strong> business
              {parsed.length === 1 ? "" : "es"}. Review and save:
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelected(new Set(parsed.map((_, i) => i)))
                }
                className="text-xs text-muted hover:text-fg"
              >
                All
              </button>
              <span className="text-muted">/</span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted hover:text-fg"
              >
                None
              </button>
            </div>
          </div>

          {result?.notes && result.notes.length > 0 && (
            <ul className="mt-3 rounded-lg border border-line bg-bg-3 p-3 text-xs text-muted space-y-1">
              {result.notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          )}

          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {parsed.map((s, i) => (
              <li key={i} className="px-3 py-3 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-1 accent-accent"
                />
                <span
                  className="mt-1 inline-block h-3 w-3 rounded-full shrink-0"
                  style={{ background: ACCENT_DOT[s.accent] }}
                />
                <span className="flex-1 min-w-0">
                  <p className="font-display truncate">{s.name}</p>
                  {s.category && (
                    <p className="text-xs text-muted truncate">{s.category}</p>
                  )}
                  {s.location && (
                    <p className="text-xs text-muted truncate">{s.location}</p>
                  )}
                  {s.link && (
                    <p className="mt-0.5 text-xs text-accent-2 truncate">
                      {s.link}
                    </p>
                  )}
                </span>
                <span
                  className={`text-[10px] font-display tracking-widest px-2 py-0.5 rounded shrink-0 ${CONF_STYLE[s.confidence]}`}
                >
                  {s.confidence.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-end gap-3">
            {saveMsg && <span className="text-xs text-muted">{saveMsg}</span>}
            <button
              type="button"
              onClick={saveSelected}
              disabled={saving || selected.size === 0}
              className="rounded-full bg-accent text-bg px-5 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : `Save ${selected.size} sponsor${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
