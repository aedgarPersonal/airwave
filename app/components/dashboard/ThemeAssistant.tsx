"use client";

import { useState } from "react";
import type { ThemeTokens } from "@/app/lib/types";

type ThemeResponse = {
  theme?: ThemeTokens;
  rationale?: string;
  applied?: boolean;
  error?: string;
};

export function ThemeAssistant({
  slug,
  initialTheme,
}: {
  slug: string;
  initialTheme: ThemeTokens | null;
}) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThemeResponse | null>(null);
  const [applying, setApplying] = useState(false);

  const run = async (apply: boolean) => {
    if (apply) setApplying(true);
    else setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/ai/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, description, apply }),
      });
      const j = (await r.json()) as ThemeResponse;
      setResult(j);
      if (apply && j.applied) {
        // Reload so the new theme is reflected everywhere.
        window.location.reload();
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setLoading(false);
      setApplying(false);
    }
  };

  const preview = result?.theme ?? initialTheme;

  return (
    <div className="rounded-2xl border border-line bg-bg-2 p-5">
      <p className="text-xs font-display tracking-widest text-accent-2">
        ✨ AI THEME
      </p>
      <p className="mt-1 text-sm">
        Describe your station&apos;s vibe in a sentence or two. AI picks an
        accessible Caribbean / African / Latin / minimal / your-choice palette.
      </p>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Example: Caribbean reggae station serving the Jamaican diaspora in Toronto. Warm, earthy, gold and green, with a bold red accent."
        className="mt-4 w-full rounded-lg bg-bg border border-line px-3 py-2 text-sm outline-none focus:border-accent resize-y"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => run(false)}
          disabled={loading || description.length < 10}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-bg-3 transition disabled:opacity-50"
        >
          {loading ? "Generating…" : "Preview palette"}
        </button>
        {result?.theme && (
          <button
            type="button"
            onClick={() => run(true)}
            disabled={applying}
            className="rounded-full bg-accent text-bg px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {applying ? "Applying…" : "Apply this theme"}
          </button>
        )}
      </div>

      {result?.error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {result.error}
        </div>
      )}

      {preview && (
        <div className="mt-5 rounded-xl border border-line p-4">
          <div className="flex flex-wrap gap-3">
            <Swatch label="ink" value={preview.ink} />
            <Swatch label="ink2" value={preview.ink2} />
            <Swatch label="cream" value={preview.cream} />
            <Swatch label="accent1" value={preview.accent1} />
            <Swatch label="accent2" value={preview.accent2} />
            <Swatch label="accent3" value={preview.accent3} />
          </div>
          <div
            className="mt-4 rounded-lg p-5"
            style={{
              background: preview.ink,
              color: preview.cream,
            }}
          >
            <p
              className="text-xs font-display tracking-widest"
              style={{ color: preview.accent2 }}
            >
              LIVE PREVIEW
            </p>
            <p className="mt-2 font-display text-3xl">Your station.</p>
            <div className="mt-3 flex gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: preview.accent1 }}
              />
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: preview.accent3 }}
              />
            </div>
            <button
              type="button"
              className="mt-3 rounded-full px-4 py-1.5 text-xs font-medium"
              style={{ background: preview.accent2, color: preview.ink }}
            >
              Donate
            </button>
          </div>
          {result?.rationale && (
            <p className="mt-3 text-xs text-muted italic">
              {result.rationale}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-6 w-6 rounded border border-line"
        style={{ background: value }}
      />
      <span className="text-xs">
        <span className="text-muted block">{label}</span>
        <span className="font-mono">{value}</span>
      </span>
    </div>
  );
}
