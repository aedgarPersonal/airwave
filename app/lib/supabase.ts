import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createBrowserClient } from "@supabase/supabase-js";

// `createServerClient` is for Route Handlers / Server Components / Server Actions
// where we want RLS applied against the signed-in user.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) {
              store.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — cookies() is read-only there.
          }
        },
      },
    },
  );
}

// Admin-side client for server code that needs to bypass RLS (webhook handlers,
// admin routes, our Clerk→Supabase user-sync stub). Keep the service-role key
// on the server only. NEVER import this from a client component.
export function supabaseAdmin() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// Public read-only client for the tenant landing pages and embed iframe.
// Uses the anon key; RLS exposes only `published` stations.
export function supabasePublic() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
