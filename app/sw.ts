/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, StaleWhileRevalidate, CacheFirst, NetworkFirst } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.destination === "document",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
      }),
    },
    {
      // Server Actions + health — network first, short cache for offline shell
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/api/") && request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "api-get",
        networkTimeoutSeconds: 8,
      }),
    },
    {
      // OSM / Leaflet tiles for offline map browsing
      matcher: ({ url }) =>
        url.hostname.includes("tile.openstreetmap.org") ||
        url.hostname.includes("basemaps.cartocdn.com") ||
        url.hostname.includes("server.arcgisonline.com"),
      handler: new CacheFirst({
        cacheName: "map-tiles",
        plugins: [],
      }),
    },
    {
      matcher: ({ request }) =>
        request.destination === "image" ||
        request.destination === "font" ||
        request.destination === "style" ||
        request.destination === "script",
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [],
      }),
    },
    {
      matcher: ({ url }) =>
        url.hostname.includes("blob.vercel-storage.com") ||
        url.hostname.includes("mapbox.com") ||
        url.hostname.includes("googleapis.com"),
      handler: new StaleWhileRevalidate({
        cacheName: "remote-assets",
      }),
    },
  ],
});

serwist.addEventListeners();
