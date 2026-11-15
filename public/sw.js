const CACHE_NAME = "diana-pwa-v34";
// Only public fallback HTML is cacheable. Signed-in navigation and RSC responses
// must never survive an account change in a shared browser.
const CORE_ROUTES = ["/offline"];
const SYNC_TAG = "diana-offline-sync";

self.addEventListener("install", (event) => {
  event.waitUntil(
    cachePublicOfflinePage().then(() => self.skipWaiting()),
  );
});

async function cachePublicOfflinePage() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CORE_ROUTES);
  const page = await cache.match("/offline");
  const html = page ? await page.text() : "";
  const staticPaths = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((match) => match[1]);
  // Public fallback assets only. No authenticated route or source document enters
  // Cache Storage. Private study packs live in account-scoped IndexedDB.
  await Promise.all([...new Set(staticPaths)].map(async (pathname) => {
    try { const response = await fetch(pathname); if (response.ok && !response.redirected) await cache.put(pathname,response); } catch { /* Online setup can be retried. */ }
  }));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith("diana-pwa-") && name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/offline"));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/diana-recognition/") || url.pathname === "/manifest.webmanifest" || url.pathname === "/icon") {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(notifyClientsToDrain());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Diana", {
      body: data.body || "A study reminder is ready.",
      icon: "/icons/diana-icon.svg",
      badge: "/icons/diana-icon.svg",
      tag: "diana-reminder",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/dashboard"));
});

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME);
  try {
    return await fetch(request);
  } catch {
    return (await cache.match(fallbackPath)) || new Response("Reconnect to open Diana.", {
      status: 503, headers: { "Content-Type": "text/plain" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (response.ok && !response.redirected) cache.put(request, response.clone());
      return response;
    })
    .catch(() => new Response("", { status: 503 }));
  return cached || update;
}

async function notifyClientsToDrain() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "DRAIN_OFFLINE_QUEUE" });
  }
}
