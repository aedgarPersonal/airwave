"use client";

import { useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const dismissKey = (slug: string) => `airwave-install-dismissed:${slug}`;

type Platform = {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isIframed: boolean;
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
      isIframed: false,
    };
  }
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const isIframed = window.self !== window.top;
  return { isMobile, isIOS, isAndroid, isStandalone, isIframed };
}

function recentlyDismissed(slug: string) {
  try {
    const raw = localStorage.getItem(dismissKey(slug));
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_MS;
  } catch {
    return false;
  }
}

// Tenant-scoped install prompt. Installation lives on the station's origin
// (either <slug>.airwave.io or a verified custom domain), so it's fine to
// attempt registration from this component.
//
// Rendered two ways:
// - Default: shows as a fixed mobile banner when appropriate
// - asButton=true: renders as an inline "Get the app" nav button
export function InstallPrompt({
  slug,
  stationName,
  asButton = false,
}: {
  slug: string;
  stationName: string;
  asButton?: boolean;
}) {
  const [platform, setPlatform] = useState<Platform>({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isStandalone: false,
    isIframed: false,
  });
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [banner, setBanner] = useState<"android" | "ios" | null>(null);
  const [modal, setModal] = useState<"ios" | "desktop" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    // Inside the embed iframe or already installed — do nothing further.
    if (p.isIframed || p.isStandalone) return;

    // Service worker lives at the origin root; a single SW serves every
    // tenant subdomain.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      if (p.isMobile && !recentlyDismissed(slug)) setBanner("android");
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    if (p.isIOS && !recentlyDismissed(slug)) setBanner("ios");

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, [slug]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (modal && !d.open) d.showModal();
    if (!modal && d.open) d.close();
  }, [modal]);

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(slug), String(Date.now()));
    } catch {
      /* ignore */
    }
    setBanner(null);
  };

  const runInstall = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setBanner(null);
      setPromptEvent(null);
      return;
    }
    setModal(platform.isIOS ? "ios" : "desktop");
  };

  // Nav button mode — always rendered when the tenant page wants a "Get
  // the app" CTA. Hidden when already installed.
  if (asButton) {
    if (platform.isStandalone || platform.isIframed) return null;
    return (
      <>
        <button
          type="button"
          onClick={runInstall}
          className="rounded-full px-4 py-1.5 font-medium text-sm flex items-center gap-1.5 transition-colors"
          style={{
            border: `1px solid color-mix(in srgb, var(--t-accent1) 60%, transparent)`,
            color: "var(--t-accent1)",
          }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M12 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 0 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L11 13.6V4a1 1 0 0 1 1-1Zm-7 16a1 1 0 0 1 1-1h12a1 1 0 0 1 0 2H6a1 1 0 0 1-1-1Z" />
          </svg>
          Get the app
        </button>
        <InstallModal
          modal={modal}
          setModal={setModal}
          dialogRef={dialogRef}
          stationName={stationName}
        />
      </>
    );
  }

  // Banner mode — auto-displayed on mobile.
  if (!banner || platform.isStandalone || platform.isIframed) return null;

  return (
    <div
      role="dialog"
      aria-label={`Install ${stationName}`}
      className="fixed inset-x-3 bottom-3 z-40 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[360px] rounded-2xl shadow-2xl p-4 flex items-start gap-3"
      style={{
        background: "var(--t-ink-2)",
        border: `1px solid color-mix(in srgb, var(--t-accent2) 40%, transparent)`,
        color: "var(--t-cream)",
      }}
    >
      <div
        className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center font-display text-sm tracking-widest"
        style={{ background: "var(--t-accent2)", color: "var(--t-ink)" }}
      >
        {stationName
          .split(/\s+/)
          .map((w) => w[0])
          .filter(Boolean)
          .slice(0, 3)
          .join("")
          .toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-base leading-tight">
          Install {stationName}
        </p>
        <p className="mt-1 text-xs opacity-70 leading-snug">
          {banner === "ios"
            ? "Tap Share, then Add to Home Screen."
            : "Add to your home screen for one-tap access."}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={
              banner === "android" ? runInstall : () => setModal("ios")
            }
            className="rounded-full text-xs font-semibold px-3 py-1.5 transition-colors"
            style={{
              background: "var(--t-accent2)",
              color: "var(--t-ink)",
            }}
          >
            {banner === "android" ? "Install" : "Show me how"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs opacity-60 hover:opacity-100"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="opacity-50 hover:opacity-100 text-xl leading-none"
      >
        ×
      </button>
      <InstallModal
        modal={modal}
        setModal={setModal}
        dialogRef={dialogRef}
        stationName={stationName}
      />
    </div>
  );
}

function InstallModal({
  modal,
  setModal,
  dialogRef,
  stationName,
}: {
  modal: "ios" | "desktop" | null;
  setModal: (m: "ios" | "desktop" | null) => void;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  stationName: string;
}) {
  return (
    <dialog
      ref={dialogRef}
      onClose={() => setModal(null)}
      className="max-w-md w-[92vw] rounded-2xl border p-0 backdrop:bg-black/70"
      style={{
        background: "var(--t-ink-2)",
        borderColor: "rgba(255,255,255,0.1)",
        color: "var(--t-cream)",
      }}
    >
      {modal && (
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h3
              className="font-display text-2xl"
              style={{ color: "var(--t-accent2)" }}
            >
              {modal === "ios"
                ? `Add ${stationName} to iPhone`
                : `Install ${stationName}`}
            </h3>
            <button
              type="button"
              onClick={() => setModal(null)}
              aria-label="Close"
              className="opacity-60 hover:opacity-100 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          {modal === "ios" ? (
            <ol className="mt-4 space-y-3 text-sm opacity-80 list-decimal list-inside">
              <li>
                Open this page in <strong>Safari</strong> (other browsers
                won&apos;t work).
              </li>
              <li>
                Tap the <strong>Share</strong> icon at the bottom of the
                screen.
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> in the top-right.
              </li>
            </ol>
          ) : (
            <ol className="mt-4 space-y-3 text-sm opacity-80 list-decimal list-inside">
              <li>
                In Chrome or Edge, click the <strong>install</strong> icon in
                the address bar.
              </li>
              <li>Confirm the install dialog.</li>
              <li>
                Safari on macOS: File menu → <strong>Add to Dock</strong>.
              </li>
            </ol>
          )}
        </div>
      )}
    </dialog>
  );
}
