import { InfoIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import type { CartNotice } from './cart';

export function noticeText(notice: CartNotice): string {
  switch (notice.type) {
    case 'removed':
      return `${notice.name} is no longer available and was removed from your cart.`;
    case 'price-changed':
      return `The price of ${notice.name} changed from ${formatMoney(notice.from)} to ${formatMoney(notice.to)}.`;
    case 'quantity-reduced':
      return `Only ${notice.to} of ${notice.name} left. The quantity was reduced from ${notice.from}.`;
    case 'out-of-stock':
      return `${notice.name} is out of stock. Remove it to continue.`;
  }
}

export function CartNotices({
  notices,
  onDismiss,
}: {
  notices: CartNotice[];
  onDismiss?: () => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm"
      data-testid="cart-notices"
    >
      <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <ul className="flex flex-1 flex-col gap-1">
        {notices.map((notice) => (
          <li key={`${notice.type}-${notice.productId}`}>{noticeText(notice)}</li>
        ))}
      </ul>
      {onDismiss ? (
        <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={onDismiss}>
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
