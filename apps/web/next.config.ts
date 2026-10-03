import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const dev = process.env.NODE_ENV !== 'production';

// Next.js injects small inline scripts, so 'unsafe-inline' is needed for scripts without nonces.
// Everything else is locked to this site and the Supabase project (API + signed file URLs).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  `media-src 'self' blob: ${supabase}`,
  `connect-src 'self' ${supabase}`,
  "font-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const config: NextConfig = {
  transpilePackages: ['@fpm/api', '@fpm/i18n', '@fpm/types', '@fpm/validation'],
  experimental: {
    // Complaint videos can be up to 50 MB; everything else is ≤ 10 MB.
    serverActions: { bodySizeLimit: '52mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default createNextIntlPlugin('./i18n/request.ts')(config);
