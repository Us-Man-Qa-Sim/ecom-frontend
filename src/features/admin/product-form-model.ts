import { z } from 'zod';
import type { Product } from '@/lib/api/types';
import {
  MAX_AMOUNT_MINOR,
  SUPPORTED_CURRENCIES,
  minorToDecimalString,
  parseMoneyInput,
} from '@/lib/money';

// The admin product form (ADM-3): what the form holds, what the gateway gets,
// and the conversion between them. Limits copy the gateway's CreateProductDto.

export const PRODUCT_LIMITS = {
  name: 200,
  description: 5000,
  category: 100,
  images: 20,
  imageUrl: 2000,
  attributes: 50,
  attributeKey: 100,
  attributeValue: 500,
};

// ── Form values (strings, as typed) ──

const text = (label: string, max: number) =>
  z.string().trim().min(1, `Enter ${label}`).max(max, `Use at most ${max} characters`);

export const productFormSchema = z
  .object({
    name: text('a name', PRODUCT_LIMITS.name),
    description: text('a description', PRODUCT_LIMITS.description),
    category: text('a category', PRODUCT_LIMITS.category),
    price: z.string().trim().min(1, 'Enter a price'),
    currency: z.enum(SUPPORTED_CURRENCIES),
    /** Only used when creating. */
    initialStock: z
      .string()
      .trim()
      .regex(/^\d{1,9}$/, 'Enter a whole number, 0 or more'),
    attributes: z
      .array(
        z.object({
          key: z.string().trim().max(PRODUCT_LIMITS.attributeKey),
          value: z.string().trim().max(PRODUCT_LIMITS.attributeValue),
        }),
      )
      .max(PRODUCT_LIMITS.attributes),
    images: z
      .array(z.object({ url: z.string().trim().max(PRODUCT_LIMITS.imageUrl) }))
      .max(PRODUCT_LIMITS.images, `Use at most ${PRODUCT_LIMITS.images} images`),
    isActive: z.boolean(),
  })
  .superRefine((values, context) => {
    const price = parseMoneyInput(values.price, values.currency);
    if (!price.ok) context.addIssue({ code: 'custom', path: ['price'], message: price.error });

    const seen = new Set<string>();
    values.attributes.forEach((attribute, index) => {
      if (!attribute.key && !attribute.value) return; // empty rows are dropped
      if (!attribute.key || !attribute.value) {
        context.addIssue({
          code: 'custom',
          path: ['attributes', index, attribute.key ? 'value' : 'key'],
          message: 'Fill in both the name and the value',
        });
      } else if (seen.has(attribute.key)) {
        context.addIssue({
          code: 'custom',
          path: ['attributes', index, 'key'],
          message: 'This name is used twice',
        });
      }
      seen.add(attribute.key);
    });

    values.images.forEach((image, index) => {
      if (!image.url) return; // empty rows are dropped
      if (!isHttpUrl(image.url)) {
        context.addIssue({
          code: 'custom',
          path: ['images', index, 'url'],
          message: 'Enter a full http(s) URL',
        });
      }
    });
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: '',
  description: '',
  category: '',
  price: '',
  currency: 'USD',
  initialStock: '0',
  attributes: [],
  images: [],
  isActive: true,
};

export function productToFormValues(product: Product): ProductFormValues {
  const currency = SUPPORTED_CURRENCIES.find((code) => code === product.price?.currency) ?? 'USD';
  return {
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price ? minorToDecimalString(product.price.amountMinor, currency) : '',
    currency,
    initialStock: '0',
    attributes: Object.entries(product.attributes).map(([key, value]) => ({ key, value })),
    images: product.images.map((url) => ({ url })),
    isActive: product.isActive,
  };
}

// ── Gateway bodies (validated again inside the Server Actions) ──

const moneyBody = z.object({
  amountMinor: z.number().int().min(0).max(MAX_AMOUNT_MINOR),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
const attributesBody = z.record(
  z.string().min(1).max(PRODUCT_LIMITS.attributeKey),
  z.string().min(1).max(PRODUCT_LIMITS.attributeValue),
);
const imagesBody = z
  .array(z.string().max(PRODUCT_LIMITS.imageUrl).refine(isHttpUrl, 'Enter a full http(s) URL'))
  .max(PRODUCT_LIMITS.images);

export const createProductBodySchema = z.strictObject({
  name: z.string().min(1).max(PRODUCT_LIMITS.name),
  description: z.string().min(1).max(PRODUCT_LIMITS.description),
  category: z.string().min(1).max(PRODUCT_LIMITS.category),
  price: moneyBody,
  initialStock: z.number().int().min(0).max(MAX_AMOUNT_MINOR),
  attributes: attributesBody,
  images: imagesBody,
});

export const updateProductBodySchema = z
  .strictObject({
    name: z.string().min(1).max(PRODUCT_LIMITS.name),
    description: z.string().min(1).max(PRODUCT_LIMITS.description),
    category: z.string().min(1).max(PRODUCT_LIMITS.category),
    price: moneyBody,
    attributes: attributesBody,
    images: imagesBody,
    isActive: z.boolean(),
  })
  .partial();

export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;

function priceBody(values: ProductFormValues) {
  const parsed = parseMoneyInput(values.price, values.currency);
  if (!parsed.ok) throw new Error(parsed.error);
  return { amountMinor: parsed.amountMinor, currency: values.currency };
}

function attributesRecord(values: ProductFormValues): Record<string, string> {
  return Object.fromEntries(
    values.attributes
      .filter((attribute) => attribute.key && attribute.value)
      .map((attribute) => [attribute.key, attribute.value]),
  );
}

function imageList(values: ProductFormValues): string[] {
  return values.images.map((image) => image.url).filter(Boolean);
}

/** Valid form values → `POST /admin/products` body. The price is sent in minor units. */
export function toCreateBody(values: ProductFormValues): CreateProductBody {
  return {
    name: values.name,
    description: values.description,
    category: values.category,
    price: priceBody(values),
    initialStock: Number(values.initialStock),
    attributes: attributesRecord(values),
    images: imageList(values),
  };
}

const sameRecord = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};
const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/**
 * Valid form values → `PATCH /admin/products/:id` body with ONLY the fields
 * that differ from the stored product. An empty object means nothing changed.
 */
export function toUpdateBody(original: Product, values: ProductFormValues): UpdateProductBody {
  const body: UpdateProductBody = {};

  if (values.name !== original.name) body.name = values.name;
  if (values.description !== original.description) body.description = values.description;
  if (values.category !== original.category) body.category = values.category;

  const price = priceBody(values);
  if (
    price.amountMinor !== original.price?.amountMinor ||
    price.currency !== original.price?.currency
  ) {
    body.price = price;
  }

  // Attributes and images are replaced as a whole when sent.
  const attributes = attributesRecord(values);
  if (!sameRecord(attributes, original.attributes)) body.attributes = attributes;
  const images = imageList(values);
  if (!sameList(images, original.images)) body.images = images;

  if (values.isActive !== original.isActive) body.isActive = values.isActive;
  return body;
}

// ── Stock adjustment (ADM-5) ──

export const adjustStockSchema = z.object({
  delta: z
    .number()
    .int('Enter a whole number')
    .min(-MAX_AMOUNT_MINOR)
    .max(MAX_AMOUNT_MINOR)
    .refine((delta) => delta !== 0, 'Enter a number other than 0'),
});

/** "+5", "-3", "12" → number, or null when it is not a signed whole number. */
export function parseDelta(input: string): number | null {
  const value = input.trim();
  if (!/^[+-]?\d{1,9}$/.test(value)) return null;
  return Number(value);
}
