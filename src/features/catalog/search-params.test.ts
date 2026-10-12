import { describe, expect, it } from 'vitest';
import { catalogHrefQuery, toProductQuery, type CatalogParams } from './search-params';

const base: CatalogParams = { category: '', search: '', minPrice: '', maxPrice: '', page: 1 };

describe('toProductQuery', () => {
  it('sends only page and pageSize when nothing is filtered', () => {
    expect(toProductQuery(base)).toEqual({ page: 1, pageSize: 12 });
  });

  it('turns major-unit prices into minor units', () => {
    expect(toProductQuery({ ...base, minPrice: '10', maxPrice: '99.99' })).toEqual({
      minPriceMinor: 1000,
      maxPriceMinor: 9999,
      page: 1,
      pageSize: 12,
    });
  });

  it('drops prices that are not valid money instead of sending them', () => {
    expect(toProductQuery({ ...base, minPrice: 'abc', maxPrice: '1.999' })).toEqual({
      page: 1,
      pageSize: 12,
    });
  });

  it('swaps min and max when they are the wrong way round', () => {
    const query = toProductQuery({ ...base, minPrice: '50', maxPrice: '10' });
    expect(query.minPriceMinor).toBe(1000);
    expect(query.maxPriceMinor).toBe(5000);
  });

  it('trims text and respects the gateway length limits', () => {
    const query = toProductQuery({ ...base, category: ' books ', search: `  ${'x'.repeat(300)}` });
    expect(query.category).toBe('books');
    expect(query.search).toHaveLength(200);
  });

  it('falls back to page 1 for a bad page', () => {
    expect(toProductQuery({ ...base, page: 0 }).page).toBe(1);
    expect(toProductQuery({ ...base, page: -3 }).page).toBe(1);
    expect(toProductQuery({ ...base, page: 4 }).page).toBe(4);
  });

  it('gives equal queries for equal filters (one cache entry)', () => {
    const a = toProductQuery({ ...base, category: 'books', search: 'rust ' });
    const b = toProductQuery({ ...base, search: 'rust', category: 'books' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('catalogHrefQuery', () => {
  it('keeps filters and leaves out empty values and page 1', () => {
    expect(catalogHrefQuery({ ...base, category: 'books', page: 1 })).toEqual({
      category: 'books',
    });
    expect(catalogHrefQuery({ ...base, search: 'mug', page: 3 })).toEqual({
      search: 'mug',
      page: '3',
    });
  });
});
