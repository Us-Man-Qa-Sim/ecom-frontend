import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/page-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser, requireSession } from '@/lib/auth/session';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Profile' };

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <Suspense fallback={<ListSkeleton rows={1} label="Loading profile" />}>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  await requireSession('/account');
  const user = await getCurrentUser();
  if (!user) return <p className="text-muted-foreground">Your profile could not be loaded.</p>;

  const rows = [
    ['Name', `${user.firstName} ${user.lastName}`],
    ['Email', user.email],
    ['Member since', formatDate(user.createdAt)],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y rounded-lg border text-sm" data-testid="profile">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Role</dt>
          <dd>
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
              {user.role === 'ADMIN' ? 'Admin' : 'Customer'}
            </Badge>
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">Profile details cannot be changed yet.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/account/addresses">Manage addresses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/orders">View orders</Link>
        </Button>
      </div>
    </div>
  );
}
