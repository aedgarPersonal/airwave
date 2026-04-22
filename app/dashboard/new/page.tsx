import Link from "next/link";
import { ImportWizard } from "@/app/components/dashboard/ImportWizard";

export default function NewStationPage() {
  return (
    <div className="flex-1">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-fg"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm font-display tracking-[0.3em] text-accent-2">
          ONBOARDING
        </p>
        <h1 className="mt-2 text-3xl font-display">Bring your station online</h1>
        <p className="mt-2 text-muted text-sm">
          Paste your station&apos;s existing URL — AI extracts your schedule,
          sponsors, brand colours, and contact info. You review everything
          before it goes live.
        </p>

        <div className="mt-8">
          <ImportWizard />
        </div>

        <p className="mt-10 text-xs text-muted">
          No existing site to import from?{" "}
          <Link
            href="/dashboard/new/manual"
            className="text-accent-2 hover:underline"
          >
            Set up manually
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
