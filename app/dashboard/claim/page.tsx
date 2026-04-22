import Link from "next/link";
import { ClaimForm } from "@/app/components/dashboard/ClaimForm";

export default function ClaimPage() {
  return (
    <div className="flex-1">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <Link href="/dashboard" className="text-sm text-muted hover:text-fg">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-display">Claim a seeded station</h1>
        <p className="mt-2 text-muted text-sm">
          If a station was pre-seeded for you by the Airwave team, enter the
          slug and the one-time claim token you were given. Ownership
          transfers to your account immediately.
        </p>

        <div className="mt-8">
          <ClaimForm />
        </div>
      </main>
    </div>
  );
}
