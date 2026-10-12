'use client';

import { SearchIcon, XIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseMoneyInput } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CATEGORIES } from './categories';
import { CATALOG_CURRENCY, catalogParsers } from './search-params';

const SEARCH_DEBOUNCE_MS = 350;

/** Filter controls. All state lives in the URL, so results can be shared and cached (FD12). */
export function CatalogFilters({ onApplied }: { onApplied?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(catalogParsers, {
    // Re-render the Server Components with the new URL.
    shallow: false,
    startTransition,
  });
  const ids = { search: useId(), min: useId(), max: useId(), priceError: useId() };

  // The search box and price inputs are edited locally and then written to the URL.
  const [search, setSearch] = useState(params.search);
  const [minPrice, setMinPrice] = useState(params.minPrice);
  const [maxPrice, setMaxPrice] = useState(params.maxPrice);
  const [priceError, setPriceError] = useState<string>();

  // Follow the URL when it changes from outside (back button, header search, "Clear").
  const lastUrl = useRef(params);
  useEffect(() => {
    if (lastUrl.current.search !== params.search) setSearch(params.search);
    if (lastUrl.current.minPrice !== params.minPrice) setMinPrice(params.minPrice);
    if (lastUrl.current.maxPrice !== params.maxPrice) setMaxPrice(params.maxPrice);
    lastUrl.current = params;
  }, [params]);

  useEffect(() => {
    if (search.trim() === params.search) return;
    const timer = setTimeout(() => {
      void setParams({ search: search.trim() || null, page: null });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, params.search, setParams]);

  const applyPrice = (event: FormEvent) => {
    event.preventDefault();
    for (const value of [minPrice, maxPrice]) {
      if (!value.trim()) continue;
      const parsed = parseMoneyInput(value, CATALOG_CURRENCY);
      if (!parsed.ok) return setPriceError(parsed.error);
    }
    setPriceError(undefined);
    void setParams({
      minPrice: minPrice.trim() || null,
      maxPrice: maxPrice.trim() || null,
      page: null,
    });
    onApplied?.();
  };

  const hasFilters = Boolean(
    params.category || params.search || params.minPrice || params.maxPrice,
  );

  return (
    <div className={cn('flex flex-col gap-6', pending && 'opacity-70')} aria-busy={pending}>
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.search}>Search</Label>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={ids.search}
            type="search"
            placeholder="Search products"
            maxLength={200}
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Category</legend>
        <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {[{ slug: '', label: 'All products' }, ...CATEGORIES].map((category) => {
            const active = params.category === category.slug;
            return (
              <Button
                key={category.slug || 'all'}
                type="button"
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={active}
                className="justify-start"
                onClick={() => {
                  void setParams({ category: category.slug || null, page: null });
                  onApplied?.();
                }}
              >
                {category.label}
              </Button>
            );
          })}
        </div>
      </fieldset>

      <form onSubmit={applyPrice} className="flex flex-col gap-2" noValidate>
        <p className="text-sm font-medium">Price ({CATALOG_CURRENCY})</p>
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor={ids.min} className="text-xs text-muted-foreground">
              Min
            </Label>
            <Input
              id={ids.min}
              inputMode="decimal"
              placeholder="0"
              value={minPrice}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? ids.priceError : undefined}
              onChange={(event) => setMinPrice(event.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor={ids.max} className="text-xs text-muted-foreground">
              Max
            </Label>
            <Input
              id={ids.max}
              inputMode="decimal"
              placeholder="Any"
              value={maxPrice}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? ids.priceError : undefined}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </div>
        {priceError ? (
          <p id={ids.priceError} role="alert" className="text-sm text-destructive">
            {priceError}
          </p>
        ) : null}
      </form>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            setPriceError(undefined);
            void setParams({
              category: null,
              search: null,
              minPrice: null,
              maxPrice: null,
              page: null,
            });
            onApplied?.();
          }}
        >
          <XIcon /> Clear filters
        </Button>
      ) : null}
    </div>
  );
}
