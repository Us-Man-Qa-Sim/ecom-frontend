import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between p-4">
        <Link href="/" aria-label="Ecom home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
