'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  /** Accessible name, for example "Quantity of Blue Mug". */
  label: string;
  disabled?: boolean;
};

export function QuantityStepper({ value, min = 1, max, onChange, label, disabled }: Props) {
  const clamp = (next: number) => Math.min(Math.max(min, next), Math.max(min, max));

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <MinusIcon />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={label}
        className="w-16 [appearance:textfield] text-center [&::-webkit-inner-spin-button]:appearance-none"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          if (Number.isFinite(next)) onChange(clamp(next));
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}
