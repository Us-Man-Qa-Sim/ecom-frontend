// Security headers set by proxy.ts on every page response (UX-4).
//
// The CSP has no per-request nonce: a nonce needs fully dynamic rendering,
// which Next.js documents as incompatible with the prerendered shells that
// Cache Components produces (plan v1.2). `script-src` therefore allows inline
// scripts. The auth tokens stay out of reach of any script because they are
// httpOnly cookies.

export type SecurityHeaderOptions = {
  /** Hostnames product images may load from (IMAGE_HOSTS). */
  imageHosts: readonly string[];
  /** Site is served over HTTPS (COOKIE_SECURE). */
  https: boolean;
  /** `next dev` needs eval and a websocket for hot reloading. */
  development: boolean;
};

export function contentSecurityPolicy({
  imageHosts,
  https,
  development,
}: SecurityHeaderOptions): string {
  const imageSources = imageHosts.flatMap((host) =>
    https ? [`https://${host}`] : [`https://${host}`, `http://${host}`],
  );

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    // next/image serves optimised images from this origin. The hosts are for the admin preview.
    'img-src': ["'self'", 'data:', 'blob:', ...imageSources],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(development ? ['ws:', 'wss:'] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (https) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

export function securityHeaders(options: SecurityHeaderOptions): Record<string, string> {
  return {
    'Content-Security-Policy': contentSecurityPolicy(options),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'X-Content-Type-Options': 'nosniff',
    // For browsers that do not know `frame-ancestors`.
    'X-Frame-Options': 'DENY',
    ...(options.https
      ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }
      : {}),
  };
}
