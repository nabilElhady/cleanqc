import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

import { CacheFirst, NetworkFirst } from 'serwist'

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // ── FONTS ────────────────────────────────────────────
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: 'google-fonts',
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200) {
                return response
              }
              return null
            }
          }
        ]
      }),
    },
    // ── STATIC ASSETS (images, icons, SVGs) ──────────────
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: new CacheFirst({
        cacheName: 'images',
      }),
    },
    // ── NEXT.JS STATIC FILES (_next/static) ───────────────
    {
      matcher: /\/_next\/static\/.*/i,
      handler: new CacheFirst({
        cacheName: 'next-static',
      }),
    },
    // ── API / SUPABASE ─────────────────────────────────────
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/') &&
        !url.pathname.includes('/auth') &&
        !url.pathname.includes('/webhook'),
      handler: new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
      }),
    },
    // ── HTML PAGES (app shell) ─────────────────────────────
    {
      matcher: ({ request }) =>
        request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 10,
      }),
    },
    // ── DEFAULT (everything else) ──────────────────────────
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()
