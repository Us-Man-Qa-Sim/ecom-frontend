import Link from 'next/link';
import { AddressLines } from '@/features/account/address-lines';
import type { Order } from '@/lib/api/types';
import { formatMoney, multiplyMoney } from '@/lib/money';

/** Items and shipping address as they were when the order was placed (snapshots). */
export function OrderDetails({ order, linkProducts = true }: { order: Order; linkProducts?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="items-heading" className="flex flex-col gap-3">
        <h2 id="items-heading" className="font-semibold">
          Items
        </h2>
        <ul className="divide-y rounded-lg border text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 p-3" data-testid="order-item">
              <div className="min-w-0">
                {linkProducts ? (
                  <Link href={`/products/${item.productId}`} className="font-medium hover:underline">
                    {item.productName}
                  </Link>
                ) : (
                  <p className="font-medium">{item.productName}</p>
                )}
                <p className="text-muted-foreground">
                  {item.quantity} × {formatMoney(item.unitPrice)}
                </p>
              </div>
              <p className="shrink-0 font-medium">
                {item.unitPrice ? formatMoney(multiplyMoney(item.unitPrice, item.quantity)) : '—'}
              </p>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 p-3 text-base font-semibold">
            <span>Total</span>
            <span data-testid="order-total">{formatMoney(order.total)}</span>
          </li>
        </ul>
        <p className="text-muted-foreground text-xs">
          Names and prices are the ones from the moment you ordered.
        </p>
      </section>

      <section aria-labelledby="shipping-heading" className="flex flex-col gap-3">
        <h2 id="shipping-heading" className="font-semibold">
          Shipping address
        </h2>
        {order.shippingAddress ? (
          <div className="rounded-lg border p-3">
            <AddressLines address={order.shippingAddress} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No address on this order.</p>
        )}
      </section>
    </div>
  );
}
