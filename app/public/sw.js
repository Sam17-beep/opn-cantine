// Bump this on any deploy that changes the app shell (pages, JS/CSS bundle) so kiosks
// pick up the new version instead of being stuck serving a stale cached shell.
const CACHE_VERSION = "v1";
const SHELL_CACHE = `cantine-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `cantine-runtime-${CACHE_VERSION}`;
const SHELL_URLS = ["/", "/manifest.json", "/bell.png"];
const NAVIGATION_TIMEOUT_MS = 3000;

// Cached response bodies here are not auth-gated content (src/middleware.ts only gates
// *access* to a route, the responses themselves don't vary per user), so caching and
// replaying them offline is safe even though the routes sit behind Basic Auth.

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

const TAB_SHELL_KEY = "/__tab_shell__";

async function handleNavigation(request) {
  const url = new URL(request.url);
  const isTabRoute = url.pathname.startsWith("/tab/");

  try {
    const response = await Promise.race([fetch(request), timeout(NAVIGATION_TIMEOUT_MS)]);
    const cache = await caches.open(SHELL_CACHE);
    // Cache under the actual request URL, not a single shared key — a page reload
    // offline should replay *that page's* last-known content (e.g. /tab/123 should
    // never serve back whatever /tab/456 last rendered).
    cache.put(request, response.clone());
    // Also keep a copy under a route-template key so a card never seen by this kiosk
    // still gets *a* /tab/[cardNumber] document (not the home page) to hydrate offline.
    if (isTabRoute) cache.put(TAB_SHELL_KEY, response.clone());
    return response;
  } catch {
    // Offline (or slow enough to time out) — try this exact URL's own cached copy first.
    // For a /tab/* URL we've truly never cached (e.g. a never-before-scanned card), fall
    // back to any previously-cached /tab/[cardNumber] document rather than the home page:
    // the served HTML's embedded React params won't match the requested URL, but the page
    // reads its real identity from the live URL (see usePathname() in
    // tab/[cardNumber]/page.tsx), not from those baked params, so it still renders the
    // right component for the *requested* path. Only the home page is an acceptable
    // fallback for non-/tab/ routes.
    const cache = await caches.open(SHELL_CACHE);
    const exact = await cache.match(request);
    if (exact) return exact;
    const fallback = await cache.match(isTabRoute ? TAB_SHELL_KEY : "/");
    if (fallback) return fallback;
    const shell = await cache.match("/");
    if (shell) return shell;
    return Response.error();
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept mutations

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Everything else (API routes, admin assets, etc.) passes through untouched.
});
