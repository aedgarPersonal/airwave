"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("riddimwsm");
  const [expected, setExpected] = useState("seed-owner-riddim");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      const r = await fetch(
        `/api/admin/stations/${encodeURIComponent(slug)}/claim`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-claim-token": token,
          },
          body: JSON.stringify({ expected_owner: expected }),
        },
      );
      const j = (await r.json()) as { hint?: string; error?: string };
      if (!r.ok) throw new Error(j.hint ?? j.error ?? "claim_failed");
      setSuccess(true);
      setTimeout(() => router.push(`/s/${slug}/identity`), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-bg-2 p-6 space-y-4"
    >
      <label className="block">
        <span className="text-sm font-medium">Station slug</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="mt-1.5 w-full rounded-lg bg-bg border border-line px-3 py-2 text-sm font-mono outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Expected seed owner</span>
        <input
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          required
          className="mt-1.5 w-full rounded-lg bg-bg border border-line px-3 py-2 text-sm font-mono outline-none focus:border-accent"
        />
        <span className="mt-1 block text-xs text-muted">
          The seeded owner_user_id on the row. For Riddim WSM this is{" "}
          <code>seed-owner-riddim</code>.
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-medium">Claim token</span>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder="Paste the CLAIM_TOKEN you were given"
          className="mt-1.5 w-full rounded-lg bg-bg border border-line px-3 py-2 text-sm font-mono outline-none focus:border-accent"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-accent-2/40 bg-accent-2/10 p-3 text-sm text-accent-2">
          Claimed. Redirecting…
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={busy || !slug || !expected || !token}
          className="rounded-full bg-accent text-bg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {busy ? "Claiming…" : "Claim station"}
        </button>
      </div>
    </form>
  );
}
