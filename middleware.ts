import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Pages that require Clerk auth. Everything under /dashboard or /s/ and the
// authenticated API surface. Public marketing, station pages, embed and
// public API stay open.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/s/(.*)",
  "/api/admin/(.*)",
  "/api/ai/(.*)",
]);

// The domain we treat as the "dashboard" origin. Everything else is a
// tenant landing page — either <slug>.ROOT or a verified custom domain.
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";

export default clerkMiddleware(async (authFn, req) => {
  const url = req.nextUrl;
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const rootBase = ROOT.toLowerCase().split(":")[0];

  // Identify whether this request is hitting the dashboard or a tenant site.
  const isDashboardHost =
    host === rootBase ||
    host === `app.${rootBase}` ||
    // Vercel preview deployments live under *.vercel.app — treat them as the
    // dashboard so we can always reach /dashboard from a preview URL.
    host.endsWith(".vercel.app") ||
    host === "localhost";

  if (isDashboardHost) {
    if (isProtectedRoute(req)) await authFn.protect();
    return NextResponse.next();
  }

  // Tenant host — rewrite to the /tenant/[host] route which resolves the slug.
  // We pass the raw host along so the resolver can handle both subdomains and
  // custom domains in one place.
  if (!url.pathname.startsWith("/api") && !url.pathname.startsWith("/_next")) {
    const rewritten = req.nextUrl.clone();
    rewritten.pathname = `/tenant/${host}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and common static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
