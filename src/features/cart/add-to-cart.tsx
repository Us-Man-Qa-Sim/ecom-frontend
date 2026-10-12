'use client';

import { ShoppingCartIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Money } from '@/lib/money';
import { ADD_FAILURE_MESSAGES, MAX_LINE_QUANTITY } from './cart';
import { QuantityStepper } from './quantity-stepper';
import { useCartStore } from './store';

type Props = {
  productId: string;
  name: string;
  price: Money | null;
  image: string | null;
  available: number;
};

export function AddToCart({ productId, name, price, image, available }: Props) {
  const [quantity, setQuantity] = useState(1);
  const add = useCartStore((state) => state.add);
  const hydrated = useCartStore((state) => state.hydrated);
  const inCart = useCartStore(
    (state) => state.lines.find((line) => line.productId === productId)?.quantity ?? 0,
  );

  const max = Math.min(available, MAX_LINE_QUANTITY);
  const remaining = Math.max(0, max - inCart);
  const soldOut = available <= 0 || !price;

  if (soldOut) {
    return (
      <Button size="lg" disabled className="w-full sm:w-auto">
        Out of stock
      </Button>
    );
  }

  const onAdd = () => {
    if (!price) return;
    const result = add(
      { productId, snapshot: { name, price, image } },
      Math.min(quantity, remaining),
    );
    if (result.ok) {
      toast.success(`Added to cart: ${name}`);
      setQuantity(1);
    } else {
      toast.error(ADD_FAILURE_MESSAGES[result.reason]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={Math.min(quantity, Math.max(1, remaining))}
          max={Math.max(1, remaining)}
          onChange={setQuantity}
          label={`Quantity of ${name}`}
          disabled={remaining === 0}
        />
        <Button
          size="lg"
          onClick={onAdd}
          disabled={!hydrated || remaining === 0}
          className="flex-1 sm:flex-none"
        >
          <ShoppingCartIcon /> Add to cart
        </Button>
      </div>
      {hydrated && inCart > 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          {remaining === 0
            ? `All ${max} available are already in your cart.`
            : `${inCart} in your cart.`}
        </p>
      ) : null}
    </div>
  );
}
