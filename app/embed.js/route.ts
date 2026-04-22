// Embed script. Creates an iframe pointing at /embed/<slug> and inserts it
// into the host page. Takes the slug from the script's ?s= query param so a
// station owner only copies one <script> tag.

export const runtime = "nodejs";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "airwave.io";
const SCRIPT = `(function(){
  try {
    var scripts = document.querySelectorAll("script[src*='/embed.js']");
    var el = scripts[scripts.length - 1];
    var src = el && el.src || "";
    var slug = new URL(src, location.href).searchParams.get("s");
    if (!slug) return;
    var target = document.querySelector("[data-airwave-station='" + slug + "']");
    if (!target) {
      target = document.createElement("div");
      target.setAttribute("data-airwave-station", slug);
      el.parentNode.insertBefore(target, el);
    }
    if (target.querySelector("iframe[data-airwave]")) return;
    var iframe = document.createElement("iframe");
    iframe.setAttribute("data-airwave", "1");
    iframe.src = "https://app.__ROOT__/embed/" + encodeURIComponent(slug);
    iframe.loading = "lazy";
    iframe.allow = "autoplay *; clipboard-write; encrypted-media";
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.minHeight = "720px";
    iframe.title = "Airwave station — " + slug;
    target.appendChild(iframe);
    // Handshake for auto-resize: listen for postMessage from the iframe.
    window.addEventListener("message", function (ev) {
      if (!ev.data || ev.data.airwaveSlug !== slug) return;
      if (typeof ev.data.height === "number") {
        iframe.style.height = ev.data.height + "px";
      }
    });
  } catch (e) { /* swallow */ }
})();`;

export async function GET() {
  const body = SCRIPT.replace(/__ROOT__/g, ROOT);
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
