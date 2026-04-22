import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-xs font-display tracking-[0.3em] text-accent-2">
          404
        </p>
        <h1 className="mt-3 text-4xl font-display">Page not found</h1>
        <p className="mt-4 text-sm text-muted leading-relaxed">
          The page you were looking for doesn&apos;t exist.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-accent text-bg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            Back to Airwave
          </Link>
          <Link
            href="/r/riddimwsm"
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:bg-bg-2 transition"
          >
            See a live station
          </Link>
        </div>
      </div>
    </div>
  );
}
