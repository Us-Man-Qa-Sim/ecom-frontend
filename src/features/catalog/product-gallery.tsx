'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ProductImage } from './product-image';

type Props = {
  /** Already checked with `allowedImageUrls`. */
  images: string[];
  name: string;
};

export function ProductGallery({ images, name }: Props) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <ProductImage
        src={current}
        alt={name}
        sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
        priority
      />
      {images.length > 1 ? (
        <ul className="grid grid-cols-5 gap-2" aria-label="Product images">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === selected ? 'true' : undefined}
                onClick={() => setSelected(index)}
                className={cn(
                  'block w-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  index === selected ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100',
                )}
              >
                <ProductImage src={image} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
