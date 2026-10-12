import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { SectionNav } from '@/components/layout/section-nav';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ListSkeleton } from '@/components/page-skeleton';
import { requireAdmin } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin · Ecom' },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
] as const;

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 md:grid-cols-[12rem_1fr] md:gap-10">
        <aside>
          <p className="mb-2 hidden px-3 text-xs font-medium text-muted-foreground uppercase md:block">
            Admin
          </p>
          <Suspense>
            <SectionNav items={[...NAV]} label="Admin" />
          </Suspense>
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 outline-none">
          <Suspense fallback={<ListSkeleton rows={3} label="Loading admin" />}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

/**
 * Second role check (FD4): proxy.ts is the first, the gateway is the third.
 * Nothing below renders until the session is verified as ADMIN.
 */
async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin('/admin');
  return children;
}
