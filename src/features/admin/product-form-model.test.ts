import { describe, expect, it } from 'vitest';
import type { Product } from '@/lib/api/types';
import {
  EMPTY_PRODUCT_FORM,
  adjustStockSchema,
  createProductBodySchema,
  parseDelta,
  productFormSchema,
  productToFormValues,
  toCreateBody,
  toUpdateBody,
  updateProductBodySchema,
  type ProductFormValues,
} from './product-form-model';

const product: Product = {
  id: 'a'.repeat(24),
  name: 'Blue Mug',
  description: 'A mug.',
  category: 'home',
  price: { amountMinor: 1299, currency: 'USD' },
  stock: { available: 8, reserved: 1 },
  attributes: { color: 'blue', size: '350ml' },
  images: ['https://cdn.example.com/mug-1.jpg', 'https://cdn.example.com/mug-2.jpg'],
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

const values: ProductFormValues = {
  ...EMPTY_PRODUCT_FORM,
  name: 'Blue Mug',
  description: 'A mug.',
  category: 'home',
  price: '12.99',
  initialStock: '25',
  attributes: [
    { key: 'color', value: 'blue' },
    { key: '', value: '' },
  ],
  images: [{ url: 'https://cdn.example.com/mug-1.jpg' }, { url: '' }],
};

const parse = (input: ProductFormValues) => productFormSchema.safeParse(input);
const issuePaths = (input: ProductFormValues) => {
  const result = parse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('toCreateBody', () => {
  it('sends the price in integer minor units', () => {
    const body = toCreateBody(values);
    expect(body.price).toEqual({ amountMinor: 1299, currency: 'USD' });
    expect(toCreateBody({ ...values, price: '19.99' }).price.amountMinor).toBe(1999);
    expect(toCreateBody({ ...values, price: '1500', currency: 'JPY' }).price).toEqual({
      amountMinor: 1500,
      currency: 'JPY',
    });
  });

  it('sends stock as a number and drops empty attribute and image rows', () => {
    const body = toCreateBody(values);
    expect(body.initialStock).toBe(25);
    expect(body.attributes).toEqual({ color: 'blue' });
    expect(body.images).toEqual(['https://cdn.example.com/mug-1.jpg']);
  });

  it('produces a body the server schema accepts, and nothing extra', () => {
    expect(createProductBodySchema.safeParse(toCreateBody(values)).success).toBe(true);
    expect(Object.keys(toCreateBody(values)).sort()).toEqual([
      'attributes',
      'category',
      'description',
      'images',
      'initialStock',
      'name',
      'price',
    ]);
  });
});

describe('toUpdateBody sends only the changed fields', () => {
  const unchanged = productToFormValues(product);

  it('sends nothing when nothing changed', () => {
    expect(toUpdateBody(product, unchanged)).toEqual({});
  });

  it('sends one field for one change', () => {
    expect(toUpdateBody(product, { ...unchanged, name: 'Green Mug' })).toEqual({ name: 'Green Mug' });
    expect(toUpdateBody(product, { ...unchanged, isActive: false })).toEqual({ isActive: false });
  });

  it('sends the price in minor units when the amount or the currency changes', () => {
    expect(toUpdateBody(product, { ...unchanged, price: '13.00' })).toEqual({
      price: { amountMinor: 1300, currency: 'USD' },
    });
    expect(toUpdateBody(product, { ...unchanged, currency: 'EUR' })).toEqual({
      price: { amountMinor: 1299, currency: 'EUR' },
    });
    // The same amount typed differently is not a change.
    expect(toUpdateBody(product, { ...unchanged, price: '12.990'.slice(0, 5) })).toEqual({});
  });

  it('replaces the whole attribute map or image list when one entry changes', () => {
    expect(
      toUpdateBody(product, {
        ...unchanged,
        attributes: [{ key: 'color', value: 'green' }, unchanged.attributes[1]!],
      }),
    ).toEqual({ attributes: { color: 'green', size: '350ml' } });

    expect(
      toUpdateBody(product, { ...unchanged, images: [...unchanged.images].reverse() }),
    ).toEqual({
      images: ['https://cdn.example.com/mug-2.jpg', 'https://cdn.example.com/mug-1.jpg'],
    });

    expect(toUpdateBody(product, { ...unchanged, images: [] })).toEqual({ images: [] });
  });

  it('never sends stock: that has its own endpoint', () => {
    const body = toUpdateBody(product, { ...unchanged, initialStock: '999', name: 'X' });
    expect(body).toEqual({ name: 'X' });
    expect(updateProductBodySchema.safeParse({ initialStock: 5 }).success).toBe(false);
  });
});

describe('productFormSchema', () => {
  it('accepts a valid form', () => {
    expect(parse(values).success).toBe(true);
  });

  it('rejects a price that is not valid money for the currency', () => {
    expect(issuePaths({ ...values, price: '12.345' })).toContain('price');
    expect(issuePaths({ ...values, price: '1.5', currency: 'JPY' })).toContain('price');
    expect(issuePaths({ ...values, price: '-1' })).toContain('price');
    expect(issuePaths({ ...values, price: '99999999999' })).toContain('price');
  });

  it('enforces the gateway length limits', () => {
    expect(issuePaths({ ...values, name: 'x'.repeat(201) })).toContain('name');
    expect(issuePaths({ ...values, description: 'x'.repeat(5001) })).toContain('description');
    expect(issuePaths({ ...values, category: 'x'.repeat(101) })).toContain('category');
  });

  it('allows at most 20 images and only http(s) URLs', () => {
    const url = (index: number) => ({ url: `https://cdn.example.com/${index}.jpg` });
    expect(parse({ ...values, images: Array.from({ length: 20 }, (_, i) => url(i)) }).success).toBe(
      true,
    );
    expect(issuePaths({ ...values, images: Array.from({ length: 21 }, (_, i) => url(i)) })).toContain(
      'images',
    );
    expect(issuePaths({ ...values, images: [{ url: 'javascript:alert(1)' }] })).toContain(
      'images.0.url',
    );
  });

  it('wants both halves of an attribute and unique names', () => {
    expect(issuePaths({ ...values, attributes: [{ key: 'color', value: '' }] })).toContain(
      'attributes.0.value',
    );
    expect(
      issuePaths({
        ...values,
        attributes: [
          { key: 'color', value: 'blue' },
          { key: 'color', value: 'red' },
        ],
      }),
    ).toContain('attributes.1.key');
  });

  it('wants a whole, non-negative initial stock', () => {
    for (const initialStock of ['-1', '1.5', 'ten', '']) {
      expect(issuePaths({ ...values, initialStock }), initialStock).toContain('initialStock');
    }
  });
});

describe('stock delta', () => {
  it('parses signed whole numbers only', () => {
    expect(parseDelta('+5')).toBe(5);
    expect(parseDelta(' -3 ')).toBe(-3);
    expect(parseDelta('12')).toBe(12);
    for (const input of ['', '1.5', 'abc', '--2', '1e3']) expect(parseDelta(input)).toBeNull();
  });

  it('never accepts 0', () => {
    expect(adjustStockSchema.safeParse({ delta: 0 }).success).toBe(false);
    expect(adjustStockSchema.safeParse({ delta: -1 }).success).toBe(true);
    expect(adjustStockSchema.safeParse({ delta: 1.5 }).success).toBe(false);
  });
});
