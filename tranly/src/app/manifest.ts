import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GeeGeeJobLa',
    short_name: 'GeeGeeJobLa',
    description: 'Learn English in Neobrutalist illustration style',
    start_url: '/new',
    display: 'standalone',
    background_color: '#FFF9F0',
    theme_color: '#2C2C2C',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
