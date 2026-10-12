import 'server-only';
import { serverEnv } from '@/env';

/**
 * `next/image` throws for a host that is not in `images.remotePatterns`, so
 * only URLs on an IMAGE_HOSTS host are passed on (FD11). Everything else
 * becomes null and the placeholder is shown.
 */
export function allowedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return serverEnv().IMAGE_HOSTS.includes(parsed.hostname) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function allowedImageUrls(urls: readonly string[]): string[] {
  return urls.map(allowedImageUrl).filter((url): url is string => url !== null);
}
