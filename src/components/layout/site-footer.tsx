import { publicEnv } from '@/env';
import { DebugFooter } from './debug-footer';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p>Ecom — a learning project. No real payments.</p>
        {publicEnv.NEXT_PUBLIC_SHOW_DEBUG ? <DebugFooter /> : null}
      </div>
    </footer>
  );
}
