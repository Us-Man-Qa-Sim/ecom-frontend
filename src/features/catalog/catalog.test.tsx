import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddToCart } from '@/features/cart/add-to-cart';
import { useCartStore } from '@/features/cart/store';
import type { Product } from '@/lib/api/types';
import { CatalogFilters } from './catalog-filters';
import { ProductCard } from './product-card';
import { StockBadge } from './stock-badge';

const product: Product = {
  id: 'a'.repeat(24),
  name: 'Mechanical Keyboard',
  description: 'Clicky.',
  category: 'electronics',
  price: { amountMinor: 12900, currency: 'USD' },
  stock: { available: 40, reserved: 2 },
  attributes: {},
  images: [],
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

describe('ProductCard', () => {
  it('shows the name, category, formatted price and a link to the product', () => {
    render(<ProductCard product={product} imageSrc={null} />);

    expect(screen.getByRole('link', { name: 'Mechanical Keyboard' })).toHaveAttribute(
      'href',
      `/products/${product.id}`,
    );
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByTestId('product-price')).toHaveTextContent('$129.00');
    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
  });

  it('formats a zero-decimal currency', () => {
    render(
      <ProductCard
        product={{ ...product, price: { amountMinor: 1500, currency: 'JPY' } }}
        imageSrc={null}
      />,
    );
    expect(screen.getByTestId('product-price')).toHaveTextContent('¥1,500');
  });

  it('flags low and missing stock', () => {
    const { rerender } = render(
      <ProductCard
        product={{ ...product, stock: { available: 3, reserved: 0 } }}
        imageSrc={null}
      />,
    );
    expect(screen.getByText('Only 3 left')).toBeInTheDocument();

    rerender(
      <ProductCard
        product={{ ...product, stock: { available: 0, reserved: 9 } }}
        imageSrc={null}
      />,
    );
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });
});

describe('StockBadge', () => {
  it('uses only the available count', () => {
    const { rerender } = render(<StockBadge available={6} />);
    expect(screen.getByText('In stock')).toBeInTheDocument();
    rerender(<StockBadge available={5} />);
    expect(screen.getByText('Only 5 left')).toBeInTheDocument();
    rerender(<StockBadge available={null} />);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });
});

describe('AddToCart', () => {
  const props = {
    productId: product.id,
    name: product.name,
    price: product.price,
    image: null,
  };

  beforeEach(() => useCartStore.setState({ lines: [], hydrated: true }));

  it('is disabled when the product is out of stock', () => {
    render(<AddToCart {...props} available={0} />);

    expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Add to cart/ })).not.toBeInTheDocument();
  });

  it('adds the chosen quantity, capped at the available stock', async () => {
    const user = userEvent.setup();
    render(<AddToCart {...props} available={2} />);

    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Add to cart/ }));

    expect(useCartStore.getState().lines).toMatchObject([{ productId: product.id, quantity: 2 }]);
    expect(screen.getByRole('button', { name: /Add to cart/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'All 2 available are already in your cart.',
    );
  });
});

describe('CatalogFilters', () => {
  function setup(searchParams = '') {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    render(
      <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
        <CatalogFilters />
      </NuqsTestingAdapter>,
    );
    const lastQuery = () => onUrlUpdate.mock.lastCall?.[0].queryString ?? '';
    return { onUrlUpdate, lastQuery, user: userEvent.setup() };
  }

  it('writes the category to the URL and resets the page', async () => {
    const { lastQuery, user } = setup('?page=3');

    await user.click(screen.getByRole('button', { name: 'Books' }));

    expect(lastQuery()).toBe('?category=books');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Books' })).toHaveAttribute('aria-pressed', 'true'),
    );
  });

  it('writes the debounced search to the URL', async () => {
    const { onUrlUpdate, lastQuery, user } = setup();

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'mug');

    await waitFor(() => expect(lastQuery()).toBe('?search=mug'));
    // One update for the whole word, not one per key.
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
  });

  it('writes the price range in major units and rejects bad input', async () => {
    const { onUrlUpdate, lastQuery, user } = setup();

    await user.type(screen.getByLabelText('Min'), '12.345');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert')).toHaveTextContent('USD allows at most 2 decimals');
    expect(onUrlUpdate).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Min'));
    await user.type(screen.getByLabelText('Min'), '10');
    await user.type(screen.getByLabelText('Max'), '99.50');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(lastQuery()).toBe('?minPrice=10&maxPrice=99.50');
  });

  it('clears every filter', async () => {
    const { lastQuery, user } = setup('?category=books&search=rust&minPrice=5&page=2');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(lastQuery()).toBe('');
  });
});
