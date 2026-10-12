import type { components } from './schema';

// Domain types. The gateway's hand-written Swagger models are wrong in a few
// places (API-2): dates and nullable strings are typed as empty objects, and
// enums are optional. The real responses are what these types describe.

type Schemas = components['schemas'];
type Fix<T, Overrides> = Omit<T, keyof Overrides> & Overrides;
type Timestamps = { createdAt: string | null; updatedAt: string | null };

export type Role = 'CUSTOMER' | 'ADMIN';
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Money = Schemas['MoneyResponse'];
export type Pagination = Schemas['PaginationResponse'];

export type User = Fix<Schemas['UserResponse'], Timestamps & { role: Role | null }>;

export type Address = Fix<
  Schemas['AddressResponse'],
  Timestamps & { label: string | null; state: string | null }
>;

export type Product = Fix<Schemas['ProductResponse'], Timestamps>;
export type ProductList = { products: Product[]; pagination: Pagination | null };

export type ShippingAddress = Fix<Schemas['ShippingAddressResponse'], { state: string | null }>;
export type OrderItem = Schemas['OrderItemResponse'];
export type Order = Fix<
  Schemas['OrderResponse'],
  Timestamps & { status: OrderStatus | null; shippingAddress: ShippingAddress | null }
>;
export type OrderList = { orders: Order[]; pagination: Pagination | null };

export type AuthTokens = Fix<
  Schemas['AuthTokensResponse'],
  { accessTokenExpiresAt: string | null }
>;
