import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUser } from '@/lib/auth/session';
import { UserMenuDropdown } from './user-menu-dropdown';

/** Reads the session cookie, so it must render inside <Suspense>. */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          {/* No prefetch: the form bundle is only needed by people who log in. */}
          <Link href="/login" prefetch={false}>
            Log in
          </Link>
        </Button>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/register" prefetch={false}>
            Sign up
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <UserMenuDropdown
      name={`${user.firstName} ${user.lastName}`.trim()}
      firstName={user.firstName}
      email={user.email}
      isAdmin={user.role === 'ADMIN'}
    />
  );
}

export function UserMenuFallback() {
  return <Skeleton className="h-8 w-20" />;
}
