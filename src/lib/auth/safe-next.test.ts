import { describe, expect, it } from 'vitest';
import { loginPathWithNext, safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it.each([
    ['/checkout', '/checkout'],
    ['/orders/123?tab=items', '/orders/123?tab=items'],
    ['/products?category=shoes&page=2#top', '/products?category=shoes&page=2#top'],
    ['/', '/'],
  ])('accepts %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    ['empty', ''],
    ['absolute URL', 'https://evil.example/login'],
    ['protocol-relative', '//evil.example'],
    ['backslash trick', '/\\evil.example'],
    ['backslash inside', '/a\\b'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['no leading slash', 'checkout'],
    ['newline', '/checkout\nSet-Cookie: x=1'],
    ['tab', '/\t/evil.example'],
    ['encoded scheme without slash', 'http:evil.example'],
  ])('rejects %s', (_label, input) => {
    expect(safeNextPath(input)).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});

describe('loginPathWithNext', () => {
  it('encodes a safe path', () => {
    expect(loginPathWithNext('/orders/1?x=1')).toBe('/login?next=%2Forders%2F1%3Fx%3D1');
  });

  it('drops an unsafe path and the home page', () => {
    expect(loginPathWithNext('//evil.example')).toBe('/login');
    expect(loginPathWithNext('/')).toBe('/login');
  });
});
