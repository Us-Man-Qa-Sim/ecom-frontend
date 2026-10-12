// Open-redirect guard for `?next=` (AUTH-6). Only same-origin relative paths pass.

const BASE = 'http://internal.invalid';

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  // Must be a path. "//host" and "/\host" are protocol-relative URLs in browsers.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  // No control characters or backslashes anywhere (browsers normalise "\" to "/").
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

export function loginPathWithNext(next: string): string {
  const safe = safeNextPath(next);
  return safe && safe !== '/' ? `/login?next=${encodeURIComponent(safe)}` : '/login';
}
