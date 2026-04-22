"use client";

import { useState } from "react";
import { format12 } from "@/app/lib/current-show";
import type { StationDay } from "@/app/lib/types";

type ParsedShow = {
  day: StationDay;
  start_min: number;
  end_min: number;
  title: string;
  host: string | null;
  crosses_midnight: boolean;
  confidence: "high" | "medium" | "low";
};

type ParseResponse = {
  shows?: ParsedShow[];
  notes?: string[];
  error?: string;
  hint?: string;
};

const CONF_STYLE: Record<ParsedShow["confidence"], string> = {
  high: "bg-accent-2/20 text-accent-2",
  medium: "bg-amber-500/20 text-amber-300",
  low: "bg-red-500/20 text-red-300",
};

export function ScheduleImporter({ slug }: { slug: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [parsed, setParsed] = useState<ParsedShow[]>([]);
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
      const r = await fetch("/api/ai/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, text }),
      });
      const j = (await r.json()) as ParseResponse;
      setResult(j);
      if (j.shows) {
        setParsed(j.shows);
        setSelected(new Set(j.shows.map((_, i) => i)));
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
      const r = await fetch(`/api/admin/stations/${slug}/shows/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shows: parsed.filter((_, i) => selected.has(i)),
        }),
      });
      const j = (await r.json()) as { inserted?: number; error?: string };
      if (!r.ok) throw new Error(j.error ?? "save_failed");
      setSaveMsg(`Added ${j.inserted} show${j.inserted === 1 ? "" : "s"}.`);
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-display tracking-widest text-accent-2">
            ✨ AI IMPORT
          </p>
          <p className="mt-1 text-sm">
            Paste your existing schedule in any format. AI normalises it to our
            schema — you review before save.
          </p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={`SUNDAY\n6 AM - 6 PM  Wally B  Gospel Sundays\n6 PM - 8 PM  Stephen C  Lick Samba\n...`}
        className="mt-4 w-full rounded-lg bg-bg border border-line px-3 py-2 text-sm font-mono outline-none focus:border-accent"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={runParse}
          disabled={loading || text.trim().length < 10}
          className="rounded-full bg-accent text-bg px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Parsing…" : "Parse with AI"}
        </button>
        <span className="text-xs text-muted">
          {text.length}/20000
        </span>
      </div>

      {result?.error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {result.error === "ai_not_configured"
            ? "AI isn't configured yet. Set ANTHROPIC_API_KEY in Vercel and redeploy."
            : result.hint ?? result.error}
        </div>
      )}

      {parsed.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              Found <strong>{parsed.length}</strong> show
              {parsed.length === 1 ? "" : "s"}. Review and save:
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
              <li
                key={i}
                className="px-3 py-2.5 flex items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="accent-accent"
                />
                <span className="text-xs font-display tracking-widest text-accent-2 w-12">
                  {s.day}
                </span>
                <span className="text-xs font-mono text-muted w-36">
                  {format12(s.start_min)}–{format12(s.end_min)}
                  {s.crosses_midnight && (
                    <span className="ml-1 opacity-60">(late)</span>
                  )}
                </span>
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-display">{s.title}</span>
                  {s.host && (
                    <span className="text-muted"> · with {s.host}</span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-display tracking-widest px-2 py-0.5 rounded ${CONF_STYLE[s.confidence]}`}
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
                : `Save ${selected.size} show${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
