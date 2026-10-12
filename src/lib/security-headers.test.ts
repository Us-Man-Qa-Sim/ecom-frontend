import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaders } from './security-headers';

const production = { imageHosts: ['cdn.example.com', 'placehold.co'], https: true, development: false };

function directives(policy: string): Record<string, string> {
  return Object.fromEntries(
    policy.split('; ').map((directive) => {
      const [name, ...values] = directive.split(' ');
      return [name, values.join(' ')];
    }),
  );
}

describe('contentSecurityPolicy', () => {
  const policy = directives(contentSecurityPolicy(production));

  it('locks everything to this origin by default', () => {
    expect(policy['default-src']).toBe("'self'");
    expect(policy['connect-src']).toBe("'self'");
    expect(policy['object-src']).toBe("'none'");
    expect(policy['base-uri']).toBe("'self'");
    expect(policy['form-action']).toBe("'self'");
    expect(policy['frame-ancestors']).toBe("'none'");
  });

  it('limits images to IMAGE_HOSTS over https', () => {
    expect(policy['img-src']).toBe(
      "'self' data: blob: https://cdn.example.com https://placehold.co",
    );
  });

  it('never allows eval or websockets in production', () => {
    expect(policy['script-src']).toBe("'self' 'unsafe-inline'");
    expect(contentSecurityPolicy(production)).not.toContain('unsafe-eval');
    expect(contentSecurityPolicy(production)).not.toContain('ws:');
    expect(contentSecurityPolicy(production)).toContain('upgrade-insecure-requests');
  });

  it('relaxes only what `next dev` needs', () => {
    const dev = directives(
      contentSecurityPolicy({ imageHosts: ['cdn.example.com'], https: false, development: true }),
    );
    expect(dev['script-src']).toBe("'self' 'unsafe-inline' 'unsafe-eval'");
    expect(dev['connect-src']).toBe("'self' ws: wss:");
    expect(dev['img-src']).toContain('http://cdn.example.com');
    expect(dev['upgrade-insecure-requests']).toBeUndefined();
  });
});

describe('securityHeaders', () => {
  it('sets the full set, with HSTS only over https', () => {
    const headers = securityHeaders(production);
    expect(headers).toMatchObject({
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });
    expect(headers['Permissions-Policy']).toContain('camera=()');

    expect(securityHeaders({ ...production, https: false })).not.toHaveProperty(
      'Strict-Transport-Security',
    );
  });
});
