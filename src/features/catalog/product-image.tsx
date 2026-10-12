'use client';

import { ImageOffIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** An allowed URL (see `allowedImageUrl`) or null for the placeholder. */
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** Square product image. Missing and broken images show a placeholder (FD11). */
export function ProductImage({ src, alt, sizes, priority = false, className }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && failedSrc !== src;

  return (
    <div
      className={cn('relative aspect-square overflow-hidden rounded-lg bg-muted', className)}
      data-slot="product-image"
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="absolute inset-0 flex items-center justify-center text-muted-foreground/60"
          data-testid="image-placeholder"
        >
          <ImageOffIcon className="size-1/4 max-h-12 max-w-12" aria-hidden />
        </div>
      )}
    </div>
  );
}
