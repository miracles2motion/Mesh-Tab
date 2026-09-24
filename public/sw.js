// MeshTab High-Performance PWA Offline Service Worker
const CACHE_NAME = "meshtab-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/home",
  "/manifest.json",
  "/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip non-http schemes, dev tools, and API sync endpoints
  if (!event.request.url.startsWith("http")) return;
  if (event.request.url.includes("/api/")) return;

  // Only intercept same-origin requests; never intercept 3rd-party domains
  try {
    const reqUrl = new URL(event.request.url);
    if (reqUrl.origin !== self.location.origin) return;
  } catch {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful basic responses for offline travel fallback
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If navigation request fails, fallback to cached /home or /
        if (event.request.mode === "navigate") {
          const homeFallback = await caches.match("/home") || await caches.match("/");
          if (homeFallback) return homeFallback;

          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline | MeshTab</title></head>
            <body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center;">
              <div>
                <h1 style="font-size:24px;margin-bottom:8px;">MeshTab Offline</h1>
                <p style="color:#a1a1aa;font-size:14px;max-width:320px;margin:0 auto 20px;">You are currently offline. Open your saved tabs or reconnect to sync with Monad.</p>
                <a href="/home" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Return Home</a>
              </div>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html" }, status: 200 }
          );
        }

        // For cancelled/aborted background fetches, return a clean empty response instead of synthetic 503
        return new Response(null, { status: 204, statusText: "No Content" });
      })
  );
});
