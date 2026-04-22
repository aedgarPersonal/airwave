// Minimal wrapper around the Vercel REST API for domain operations. We hit
// it server-side from admin routes; never from the browser.
//
// Scopes/tokens:
//  - VERCEL_API_TOKEN: personal/team token with "domains" scope
//  - VERCEL_PROJECT_ID: the Airwave project we're adding domains TO
//  - VERCEL_TEAM_ID: optional, only needed when the project lives in a team

const API = "https://api.vercel.com";

function headers() {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error(
      "VERCEL_API_TOKEN not set — custom-domain features are disabled",
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function scopedPath(path: string) {
  const team = process.env.VERCEL_TEAM_ID;
  if (!team) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}teamId=${encodeURIComponent(team)}`;
}

export function vercelConfigured() {
  return (
    !!process.env.VERCEL_API_TOKEN && !!process.env.VERCEL_PROJECT_ID
  );
}

type AddDomainResult = {
  id: string;
  name: string;
  verified: boolean;
  verification?: Array<{ type: string; domain: string; value: string; reason?: string }>;
};

// POST /v10/projects/{idOrName}/domains
export async function addProjectDomain(
  domain: string,
): Promise<AddDomainResult> {
  const pid = process.env.VERCEL_PROJECT_ID!;
  const res = await fetch(
    `${API}${scopedPath(`/v10/projects/${pid}/domains`)}`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: domain }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`vercel add_domain ${res.status}: ${body}`);
  }
  return res.json();
}

// GET /v9/projects/{idOrName}/domains/{domain}/verify
export async function verifyProjectDomain(
  domain: string,
): Promise<AddDomainResult> {
  const pid = process.env.VERCEL_PROJECT_ID!;
  const res = await fetch(
    `${API}${scopedPath(`/v9/projects/${pid}/domains/${encodeURIComponent(domain)}/verify`)}`,
    { method: "POST", headers: headers() },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`vercel verify ${res.status}: ${body}`);
  }
  return res.json();
}

// DELETE /v9/projects/{idOrName}/domains/{domain}
export async function removeProjectDomain(domain: string) {
  const pid = process.env.VERCEL_PROJECT_ID!;
  const res = await fetch(
    `${API}${scopedPath(`/v9/projects/${pid}/domains/${encodeURIComponent(domain)}`)}`,
    { method: "DELETE", headers: headers() },
  );
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`vercel remove ${res.status}: ${body}`);
  }
}
