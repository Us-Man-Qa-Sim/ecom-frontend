import { z } from 'zod';
import { COUNTRY_CODES } from './countries';

// Limits copy the gateway's CreateAddressDto (FD9).
export const ADDRESS_LIMITS = { label: 50, street: 200, city: 100, state: 100, postalCode: 20 };

const required = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .max(max, `Use at most ${max} characters`);
const optional = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);

export const addressSchema = z.object({
  label: optional(ADDRESS_LIMITS.label),
  street: required('a street address', ADDRESS_LIMITS.street),
  city: required('a city', ADDRESS_LIMITS.city),
  state: optional(ADDRESS_LIMITS.state),
  postalCode: required('a postal code', ADDRESS_LIMITS.postalCode),
  country: z
    .string()
    .refine((code) => COUNTRY_CODES.has(code), 'Choose a country'),
  isDefault: z.boolean(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const EMPTY_ADDRESS: AddressInput = {
  label: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  isDefault: false,
};
