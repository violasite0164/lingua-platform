import type { NextConfig } from 'next';

import { writeNextServerSkeletonsIfMissing, startDevManifestSkeletonPolling } from './lib/next-dev-server-skeleton';

// Earliest point we control: Next reads manifests before the first Webpack compile finishes.
if (typeof process !== 'undefined' && process.argv.includes('dev')) {
  try {
    writeNextServerSkeletonsIfMissing();
    startDevManifestSkeletonPolling();
  } catch {
    /* non-fatal */
  }
}

const nextConfig: NextConfig = {
  webpack(config, { dev, isServer }) {
    if (dev && isServer) {
      const plugins = config.plugins ?? (config.plugins = []);

      // next.config runs once; `.next/server` can be cleared between compilations.
      // Tap webpack hooks so missing manifests / _document stub are recreated each cycle.
      plugins.push(
        new (class EnsureNextServerSkeletonsPlugin {
          apply(compiler: {
            hooks: {
              run: { tap: (name: string, fn: () => void) => void };
              compile: { tap: (name: string, fn: () => void) => void };
              watchRun: { tap: (name: string, fn: () => void) => void };
            };
          }) {
            const run = () => {
              try {
                writeNextServerSkeletonsIfMissing();
              } catch {
                // Non-fatal.
              }
            };
            compiler.hooks.run.tap('EnsureNextServerSkeletons', run);
            compiler.hooks.compile.tap('EnsureNextServerSkeletons', run);
            compiler.hooks.watchRun.tap('EnsureNextServerSkeletons', run);
          }
        })(),
      );

      // Disable splitChunks for the server bundle to avoid MODULE_NOT_FOUND
      // race conditions where chunk files are requested before Webpack writes them.
      config.optimization.splitChunks = false;
    }
    return config;
  },

  serverExternalPackages: [
    '@supabase/ssr',
    '@supabase/supabase-js',
    '@supabase/auth-js',
    'stripe',
    'wavesurfer.js',
    'pdf-lib',
  ],

  experimental: {
    /** 課本 PDF 上傳（lib/mentor/textbook-storage MAX_LESSON_TEXTBOOK_BYTES = 50 MiB） */
    serverActions: {
      bodySizeLimit: '50mb',
    },
    middlewareClientMaxBodySize: '50mb',
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'customer-*.cloudflarestream.com' },
      { protocol: 'https', hostname: 'imagedelivery.net' },
      { protocol: 'https', hostname: 'videodelivery.net' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
