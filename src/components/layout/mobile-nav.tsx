'use client';

import { MenuIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

const loadSheet = () => import('./mobile-nav-sheet');
const MobileNavSheet = dynamic(loadSheet, { ssr: false });

/**
 * Menu button for small screens (CAT-1). `search` is the server-rendered
 * search form. The sheet is fetched on first use (UX-5).
 */
export function MobileNav({ search }: { search: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={() => void loadSheet()}
        onFocus={() => void loadSheet()}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <MenuIcon className="size-5" />
      </Button>
      {loaded ? <MobileNavSheet
          open={open}
          onOpenChange={setOpen}
          search={search}
          returnFocusRef={buttonRef}
        /> : null}
    </>
  );
}
