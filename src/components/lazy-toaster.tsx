'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Toaster = dynamic(() => import('@/components/ui/sonner').then((module) => module.Toaster), {
  ssr: false,
});

/**
 * Mounts the toast region once the page is idle or on the first user input,
 * whichever comes first. Toasts only follow a user action, so the toast code
 * does not need to be in the JavaScript that makes the page interactive (UX-5).
 */
export function LazyToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = () => setReady(true);
    // Safari has no requestIdleCallback.
    const hasIdleCallback = typeof window.requestIdleCallback === 'function';
    const handle = hasIdleCallback
      ? window.requestIdleCallback(mount, { timeout: 2000 })
      : window.setTimeout(mount, 200);
    const events = ['pointerdown', 'keydown'] as const;
    for (const event of events) window.addEventListener(event, mount, { once: true, capture: true });

    return () => {
      if (hasIdleCallback) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      for (const event of events) window.removeEventListener(event, mount, { capture: true });
    };
  }, []);

  return ready ? <Toaster richColors closeButton /> : null;
}
