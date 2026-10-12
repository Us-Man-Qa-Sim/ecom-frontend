'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const loadMenu = () => import('./theme-menu');

const trigger = (
  <Button variant="ghost" size="icon" aria-label="Change theme" aria-haspopup="menu">
    <SunIcon className="size-5 dark:hidden" />
    <MoonIcon className="hidden size-5 dark:block" />
  </Button>
);

const ThemeMenu = dynamic(loadMenu, { ssr: false, loading: () => trigger });

/**
 * Light / dark / system switch (FD8). The dropdown code is fetched on the
 * first hover, focus or click, so it is not part of every page load (UX-5).
 */
export function ThemeToggle() {
  const [opened, setOpened] = useState(false);

  if (opened) return <ThemeMenu trigger={trigger} />;
  return (
    <span onPointerEnter={() => void loadMenu()} onFocus={() => void loadMenu()}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Change theme"
        aria-haspopup="menu"
        onClick={() => setOpened(true)}
      >
        <SunIcon className="size-5 dark:hidden" />
        <MoonIcon className="hidden size-5 dark:block" />
      </Button>
    </span>
  );
}
