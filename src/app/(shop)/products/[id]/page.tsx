import { ChevronRightIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicEnv } from '@/env';
import { AddToCart } from '@/features/cart/add-to-cart';
import { categoryLabel } from '@/features/catalog/categories';
import { getProduct } from '@/features/catalog/data';
import { allowedImageUrls } from '@/features/catalog/images';
import { ProductGallery } from '@/features/catalog/product-gallery';
import { StockBadge } from '@/features/catalog/stock-badge';
import type { Product } from '@/lib/api/types';
import { formatMoney, minorToDecimalString } from '@/lib/money';

export async function generateMetadata({ params }: PageProps<'/products/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: 'Product not found', robots: { index: false } };

  const description = product.description.slice(0, 160);
  const images = allowedImageUrls(product.images).slice(0, 1);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: { title: product.name, description, type: 'website', images },
  };
}

export default async function ProductPage({ params }: PageProps<'/products/[id]'>) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const images = allowedImageUrls(product.images);
  const available = product.stock?.available ?? 0;
  const attributes = Object.entries(product.attributes);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/products" className="hover:text-foreground">
              Products
            </Link>
          </li>
          <ChevronRightIcon className="size-3.5" aria-hidden />
          <li>
            <Link
              href={{ pathname: '/products', query: { category: product.category } }}
              className="hover:text-foreground"
            >
              {categoryLabel(product.category)}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <ProductGallery images={images} name={product.name} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-semibold" data-testid="product-price">
                {formatMoney(product.price)}
              </p>
              <StockBadge available={available} />
            </div>
          </div>

          <AddToCart
            productId={product.id}
            name={product.name}
            price={product.price}
            image={images[0] ?? null}
            available={available}
          />

          {product.description ? (
            <section aria-labelledby="description-heading" className="flex flex-col gap-2">
              <h2 id="description-heading" className="text-sm font-medium">
                Description
              </h2>
              <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
            </section>
          ) : null}

          {attributes.length > 0 ? (
            <section aria-labelledby="details-heading" className="flex flex-col gap-2">
              <h2 id="details-heading" className="text-sm font-medium">
                Details
              </h2>
              <dl className="divide-y rounded-lg border text-sm">
                {attributes.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[minmax(6rem,1fr)_2fr] gap-2 px-3 py-2">
                    <dt className="text-muted-foreground capitalize">{key}</dt>
                    <dd className="break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>

      <ProductJsonLd product={product} image={images[0]} />
    </div>
  );
}

/** schema.org Product/Offer for search engines (CAT-8). */
function ProductJsonLd({ product, image }: { product: Product; image: string | undefined }) {
  const url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/products/${product.id}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    category: product.category,
    sku: product.id,
    url,
    ...(image ? { image } : {}),
    ...(product.price
      ? {
          offers: {
            '@type': 'Offer',
            url,
            price: minorToDecimalString(product.price.amountMinor, product.price.currency),
            priceCurrency: product.price.currency,
            availability:
              (product.stock?.available ?? 0) > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // "<" is escaped so product text can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
