// GAP-5: the gateway has no category list yet, so the categories of the seed
// catalog (product-service `sample-catalog.ts`) are listed here. When
// `GET /products/categories` exists, replace this list with that call.
export const CATEGORIES = [
  { slug: 'electronics', label: 'Electronics' },
  { slug: 'books', label: 'Books' },
  { slug: 'home', label: 'Home' },
  { slug: 'apparel', label: 'Apparel' },
] as const;

export function categoryLabel(slug: string): string {
  const known = CATEGORIES.find((category) => category.slug === slug);
  if (known) return known.label;
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Uncategorised';
}
