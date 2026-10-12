import Link from 'next/link';
import { Suspense } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { CartButton } from '@/features/cart/cart-button';
import { HeaderSearch } from './header-search';
import { Logo } from './logo';
import { MobileNav } from './mobile-nav';
import { UserMenu, UserMenuFallback } from './user-menu';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-1 px-2 sm:gap-2 sm:px-4">
        <MobileNav search={<HeaderSearch />} />
        <Link href="/" aria-label="Ecom home" className="mr-2">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
          <Link
            href="/products"
            className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            Products
          </Link>
        </nav>
        <HeaderSearch className="mx-2 hidden max-w-sm flex-1 md:block" />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          <CartButton />
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
