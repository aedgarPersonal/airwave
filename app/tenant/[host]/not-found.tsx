import Link from "next/link";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";

export default function TenantNotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-xs font-display tracking-[0.3em] text-accent-2">
          404 · STATION NOT FOUND
        </p>
        <h1 className="mt-3 text-4xl font-display">
          No station at this address.
        </h1>
        <p className="mt-4 text-sm text-muted leading-relaxed">
          The station you&apos;re looking for doesn&apos;t exist yet, or its
          owner hasn&apos;t published it.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href={`https://app.${ROOT}`}
            className="rounded-full bg-accent text-bg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            Go to Airwave
          </Link>
        </div>
      </div>
    </div>
  );
}
