'use client';

import { UserRoundIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState, type ComponentProps } from 'react';
import { Button } from '@/components/ui/button';

type Props = { name: string; firstName: string; email: string; isAdmin: boolean };

const loadContent = () => import('./user-menu-content');

function Trigger({ name, firstName, ...props }: ComponentProps<typeof Button> & Pick<Props, 'name' | 'firstName'>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Account menu for ${name}`}
      aria-haspopup="menu"
      {...props}
    >
      <UserRoundIcon className="size-5" />
      <span className="hidden max-w-32 truncate sm:inline" data-testid="user-name">
        {firstName}
      </span>
    </Button>
  );
}

/** Account button. The dropdown is fetched on the first hover, focus or click (UX-5). */
export function UserMenuDropdown({ name, firstName, email, isAdmin }: Props) {
  const [opened, setOpened] = useState(false);
  const [UserMenuContent] = useState(() =>
    dynamic(loadContent, {
      ssr: false,
      loading: () => <Trigger name={name} firstName={firstName} />,
    }),
  );

  if (opened) {
    return (
      <UserMenuContent
        trigger={<Trigger name={name} firstName={firstName} />}
        name={name}
        email={email}
        isAdmin={isAdmin}
      />
    );
  }
  return (
    <Trigger
      name={name}
      firstName={firstName}
      onPointerEnter={() => void loadContent()}
      onFocus={() => void loadContent()}
      onClick={() => setOpened(true)}
    />
  );
}
