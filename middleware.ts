import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/s/(.*)",
  "/api/admin/(.*)",
  "/api/ai/(.*)",
]);

// Returns true when this request belongs to the dashboard surface (marketing
// + signed-in tools). Anything else is a tenant host.
function isDashboardHost(host: string) {
  const base = ROOT.toLowerCase().split(":")[0];
  return (
    host === base ||
    host === `app.${base}` ||
    host.endsWith(".vercel.app") ||
    host === "localhost"
  );
}

// Tenant requests rewrite to /tenant/[host] so the shared page can resolve
// both subdomains and custom domains through one code path.
function tenantRewrite(req: NextRequest, host: string) {
  const url = req.nextUrl;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_next")) {
    return NextResponse.next();
  }
  const rewritten = url.clone();
  rewritten.pathname = `/tenant/${host}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(rewritten);
}

// When Clerk isn't configured we can't call clerkMiddleware() — it throws at
// module init. Use a plain middleware that only does subdomain routing.
const CLERK_CONFIGURED =
  !!process.env.CLERK_SECRET_KEY &&
  !process.env.CLERK_SECRET_KEY.includes("placeholder");

const withClerk = clerkMiddleware(async (authFn, req) => {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  if (isDashboardHost(host)) {
    if (isProtectedRoute(req)) await authFn.protect();
    return NextResponse.next();
  }
  return tenantRewrite(req, host);
});

function withoutClerk(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  if (isDashboardHost(host)) return NextResponse.next();
  return tenantRewrite(req, host);
}

const handler = CLERK_CONFIGURED ? withClerk : withoutClerk;
export default handler;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
