import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SectionNav } from '@/components/layout/section-nav';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

// Pages tied to a user are never indexed and never cached (FD7).
export const metadata: Metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: '/orders', label: 'Orders' },
  { href: '/account', label: 'Profile', exact: true },
  { href: '/account/addresses', label: 'Addresses' },
] as const;

export default function AccountLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 md:grid-cols-[12rem_1fr] md:gap-10">
        <aside>
          <Suspense>
            <SectionNav items={[...NAV]} label="Account" />
          </Suspense>
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
