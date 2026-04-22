"use client";

import { useEffect, useState } from "react";

type Domain = {
  id: string;
  domain: string;
  verified_at: string | null;
  vercel_domain_id: string | null;
  created_at: string;
};

type Verification = {
  type: string;
  domain: string;
  value: string;
  reason?: string;
};

export function DomainManager({ slug }: { slug: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [vercelOn, setVercelOn] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [verification, setVerification] = useState<
    Record<string, Verification[]>
  >({});
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/stations/${slug}/domains`);
      const j = await r.json();
      setDomains(j.domains ?? []);
      setVercelOn(!!j.vercelConfigured);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line

  const add = async () => {
    setError(null);
    setAdding(true);
    try {
      const r = await fetch(`/api/admin/stations/${slug}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: input.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.hint ?? j.error ?? "add_failed");
      if (j.verification?.length) {
        setVerification((v) => ({ ...v, [j.domain]: j.verification }));
      }
      setInput("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setAdding(false);
    }
  };

  const verify = async (domain: string) => {
    setError(null);
    try {
      const r = await fetch(
        `/api/admin/stations/${slug}/domains/${encodeURIComponent(domain)}`,
        { method: "POST" },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "verify_failed");
      if (j.verification) {
        setVerification((v) => ({ ...v, [domain]: j.verification }));
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verify failed");
    }
  };

  const remove = async (domain: string) => {
    if (!confirm(`Remove ${domain}?`)) return;
    try {
      await fetch(
        `/api/admin/stations/${slug}/domains/${encodeURIComponent(domain)}`,
        { method: "DELETE" },
      );
      setVerification((v) => {
        const n = { ...v };
        delete n[domain];
        return n;
      });
      await refresh();
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      {!vercelOn && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 mb-6">
          Custom domains require the platform admin to set{" "}
          <code>VERCEL_API_TOKEN</code> and <code>VERCEL_PROJECT_ID</code>. Ask
          us to enable this for your account.
        </div>
      )}

      <div className="rounded-2xl border border-line bg-bg-2 p-5">
        <p className="text-xs font-display tracking-widest text-muted">
          ADD A DOMAIN
        </p>
        <p className="mt-1 text-sm text-muted">
          Typically a subdomain of your existing station domain like{" "}
          <code>app.yourstation.com</code>. Airwave will issue an SSL
          certificate automatically.
        </p>
        <div className="mt-4 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="app.yourstation.com"
            className="flex-1 rounded-lg bg-bg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={add}
            disabled={adding || !input || !vercelOn}
            className="rounded-full bg-accent text-bg px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-xs text-red-300">{error}</p>
        )}
      </div>

      <ul className="mt-6 space-y-3">
        {loading && <li className="text-muted text-sm">Loading…</li>}
        {!loading && domains.length === 0 && (
          <li className="rounded-2xl border border-line bg-bg-2 p-6 text-muted text-sm">
            No custom domains yet. Your station is available at{" "}
            <code>
              {slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io"}
            </code>
            .
          </li>
        )}
        {domains.map((d) => {
          const vrec = verification[d.domain];
          const verified = !!d.verified_at;
          return (
            <li
              key={d.id}
              className="rounded-2xl border border-line bg-bg-2 p-5"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg">{d.domain}</p>
                    <span
                      className={`text-[10px] font-display tracking-widest px-2 py-0.5 rounded ${
                        verified
                          ? "bg-accent-2/20 text-accent-2"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {verified ? "LIVE" : "PENDING"}
                    </span>
                  </div>
                  {verified && (
                    <a
                      href={`https://${d.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent-2 hover:underline"
                    >
                      https://{d.domain} →
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => verify(d.domain)}
                    className="text-muted hover:text-fg transition"
                  >
                    Recheck
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(d.domain)}
                    className="text-muted hover:text-red-400 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {!verified && vrec && vrec.length > 0 && (
                <div className="mt-4 rounded-lg border border-line bg-bg-3 p-4">
                  <p className="text-xs font-display tracking-widest text-muted">
                    DNS INSTRUCTIONS
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Add this record at your DNS provider, then click Recheck.
                    Propagation can take a few minutes.
                  </p>
                  <table className="mt-3 text-xs w-full">
                    <tbody>
                      {vrec.map((v, i) => (
                        <tr key={i} className="border-t border-line/50">
                          <td className="py-1.5 pr-3 text-muted font-mono">
                            {v.type}
                          </td>
                          <td className="py-1.5 pr-3 font-mono">{v.domain}</td>
                          <td className="py-1.5 font-mono break-all">
                            {v.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!verified && !vrec && (
                <p className="mt-3 text-xs text-muted">
                  Waiting on verification. Click <em>Recheck</em> to refresh
                  status.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
