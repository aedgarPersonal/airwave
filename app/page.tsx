import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <nav className="mx-auto w-full max-w-6xl px-6 pt-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 px-2 items-center justify-center rounded-md bg-accent text-bg font-display tracking-widest text-sm">
            AIRWAVE
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Show when="signed-out">
            <Link href="/sign-in" className="text-muted hover:text-fg transition-colors">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-accent text-bg px-4 py-1.5 font-medium hover:opacity-90 transition"
            >
              Get started
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-accent text-bg px-4 py-1.5 font-medium hover:opacity-90 transition"
            >
              Open dashboard
            </Link>
          </Show>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
        <p className="text-xs font-display tracking-[0.3em] text-accent-2">
          FOR GRASSROOTS RADIO
        </p>
        <h1 className="mt-4 text-5xl sm:text-7xl font-display leading-[0.95] max-w-3xl">
          Your station,<br />on every listener&apos;s home screen.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted leading-relaxed">
          Airwave turns your existing radio station into a modern web presence —
          live player, schedule, sponsors, donations, and a mobile-installable
          app — without replacing your current site. Paste your station&apos;s
          URL and AI does the rest.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Show when="signed-out">
            <Link
              href="/sign-up"
              className="rounded-full bg-accent text-bg px-6 py-3 font-medium hover:opacity-90 transition"
            >
              Bring your station online →
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-accent text-bg px-6 py-3 font-medium hover:opacity-90 transition"
            >
              Go to dashboard →
            </Link>
          </Show>
          <a
            href="#how"
            className="rounded-full border border-line text-fg px-6 py-3 font-medium hover:bg-bg-2 transition"
          >
            See how it works
          </a>
        </div>

        <section id="how" className="mt-28 grid gap-10 md:grid-cols-3">
          {[
            {
              h: "Import what you have",
              p: "Paste your station's website or radio-host URL. AI extracts your schedule, sponsors, brand colours, and contact info.",
            },
            {
              h: "Edit in one place",
              p: "Your schedule, show hosts, sponsors, donations, and live chat — all editable from a single dashboard.",
            },
            {
              h: "Embed + install",
              p: "Paste our snippet into your existing site, and share your app URL for listeners to install on their phone.",
            },
          ].map((s) => (
            <div
              key={s.h}
              className="rounded-2xl border border-line bg-bg-2 p-6"
            >
              <h3 className="font-display text-2xl">{s.h}</h3>
              <p className="mt-3 text-muted leading-relaxed text-sm">{s.p}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted">
          © {new Date().getFullYear()} Airwave · Built for independent radio.
        </div>
      </footer>
    </div>
  );
}
