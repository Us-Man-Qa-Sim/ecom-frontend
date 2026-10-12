'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type DebugInfo = {
  requestId: string | null;
  gatewayInstance: string | null;
  path: string;
  status: number;
} | null;

function DebugFooterInner() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [info, setInfo] = useState<DebugInfo>(null);

  // Ask again after every navigation: the round-robin shows up as a changing instance (LB-2).
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/debug', { signal: controller.signal, cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((body: { last: DebugInfo } | null) => setInfo(body?.last ?? null))
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pathname, search]);

  if (!info) return null;
  return (
    <p className="font-mono text-xs break-all" data-testid="debug-footer">
      {info.path} → {info.status} · {info.gatewayInstance ?? 'no instance'} ·{' '}
      {info.requestId ?? 'no request id'}
    </p>
  );
}

export function DebugFooter() {
  return (
    <Suspense>
      <DebugFooterInner />
    </Suspense>
  );
}
