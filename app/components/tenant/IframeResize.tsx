"use client";

import { useEffect } from "react";

// When rendered inside an iframe, reports the document height back to the
// parent so the embed.js snippet can resize the iframe to fit content. Safe
// no-op when not iframed.
export function IframeResize({ slug }: { slug: string }) {
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const send = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ airwaveSlug: slug, height }, "*");
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [slug]);
  return null;
}
