"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function LogoManager({
  slug,
  currentLogo,
}: {
  slug: string;
  currentLogo: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const doUpload = async (file: File) => {
    setError(null);
    setNote(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/admin/stations/${slug}/logo`, {
        method: "PUT",
        body: fd,
      });
      const j = (await r.json()) as { hint?: string; error?: string };
      if (!r.ok) throw new Error(j.hint ?? j.error ?? "upload_failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const doGenerate = async () => {
    setError(null);
    setNote(null);
    setGenerating(true);
    try {
      const r = await fetch(`/api/ai/logo/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const j = (await r.json()) as { hint?: string; error?: string };
      if (!r.ok) throw new Error(j.hint ?? j.error ?? "generate_failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  };

  const doExtract = async () => {
    setError(null);
    setNote(null);
    setExtracting(true);
    try {
      const r = await fetch(`/api/ai/logo/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, apply: true }),
      });
      const j = (await r.json()) as {
        hint?: string;
        error?: string;
        rationale?: string;
      };
      if (!r.ok) throw new Error(j.hint ?? j.error ?? "extract_failed");
      setNote(j.rationale ?? "Theme updated from logo.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extract failed");
    } finally {
      setExtracting(false);
    }
  };

  const doClear = async () => {
    if (!confirm("Remove the current logo?")) return;
    await fetch(`/api/admin/stations/${slug}/logo`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-line bg-bg-2 p-5">
      <p className="text-xs font-display tracking-widest text-muted">LOGO</p>
      <p className="mt-1 text-sm text-muted">
        Used as your PWA home-screen icon, the nav badge, and the embed header.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] items-start">
        <div className="h-32 w-32 rounded-xl border border-line bg-bg flex items-center justify-center overflow-hidden">
          {currentLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentLogo}
              alt="Station logo"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted">No logo</span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doUpload(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-full bg-accent text-bg px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload logo"}
            </button>
            <button
              type="button"
              onClick={doGenerate}
              disabled={generating}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-bg-3 transition disabled:opacity-50"
            >
              {generating ? "Generating…" : "✨ Generate with AI"}
            </button>
            {currentLogo && (
              <>
                <button
                  type="button"
                  onClick={doExtract}
                  disabled={extracting}
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-bg-3 transition disabled:opacity-50"
                >
                  {extracting ? "Reading…" : "✨ Match theme to logo"}
                </button>
                <button
                  type="button"
                  onClick={doClear}
                  className="rounded-full border border-line px-3 py-2 text-xs text-muted hover:text-red-400 transition"
                >
                  Remove
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-muted">
            PNG, JPEG, WebP, or SVG · max 2 MB · square works best.
          </p>
          {error && <p className="text-xs text-red-300">{error}</p>}
          {note && <p className="text-xs text-accent-2">{note}</p>}
        </div>
      </div>
    </div>
  );
}
