import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Crewmark',
    short_name: 'Crewmark',
    description: 'Cleaning QA and Dispatch platform',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAFAFA',
    theme_color: '#09090B',
    categories: ['productivity', 'business'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [],
  }
}
