// Universal Airwave service worker. Hosted at the origin root so it can
// satisfy installability for the dashboard and every tenant subdomain.
//
// Responsibilities are intentionally minimal: the qualifying fetch handler is
// a pass-through, and we leave audio streams alone (they can't be cached
// meaningfully for live radio).

const SW_VERSION = "airwave-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", () => {
  // Pass-through — browser handles it normally.
});
