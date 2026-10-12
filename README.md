# ecom-frontend

Storefront and admin UI for the ecom microservices backend.

**Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Docker**

The plan, decisions and task list are in [`../FRONTEND_PLAN.md`](../FRONTEND_PLAN.md).

## What it does

- **Customers:** browse and search the catalog, keep a cart, register and log in, manage
  addresses, place orders, watch an order go from `PENDING` to `CONFIRMED` or `CANCELLED`, cancel
  orders.
- **Admins:** create, edit, deactivate and delete products, adjust stock, list orders and move
  them through `SHIPPED` and `DELIVERED`.

## Architecture

```
                    ┌──────────────────────────────────────────────────────┐
  Browser ──HTTP──► │ Next.js  (this repo, :3001)                          │
  (no tokens,       │  • React Server Components  → read pages             │
   httpOnly         │  • Server Actions           → every mutation         │
   cookies only)    │  • proxy.ts                 → auth gate + refresh    │
                    │  • /api/* route handlers    → client polling (BFF)   │
                    └───────────────┬──────────────────────────────────────┘
                                    │ server-to-server REST/JSON
                                    │ Authorization: Bearer <access>
                                    │ x-request-id, X-Forwarded-For
                                    ▼
                              NGINX (LB) :80  ──►  api-gateway ×2  ──gRPC──►  services
```

- **The browser only talks to Next.js.** The access and refresh tokens live in `httpOnly` cookies
  (`ecom_at`, `ecom_rt`) and are attached on the server. Page scripts never see a JWT.
- **`src/proxy.ts`** runs before every page request. It verifies the access token (RS256, the same
  public key the gateway uses), refreshes it when it is about to expire, protects `/checkout`,
  `/orders`, `/account` and `/admin`, and sets the security headers and an `x-request-id`.
- **Refresh is single-flight.** user-service revokes a whole token family when a refresh token is
  used twice, so parallel requests share one refresh call (`src/lib/auth/refresh.ts`). This holds
  for **one** Next.js instance only.
- **Reads** are async Server Components. Catalog reads are cached with `'use cache'` and the tags
  `products` and `product:<id>`. Admin mutations call `updateTag`, so the shop updates at once.
  Pages tied to a user are never cached.
- **Writes** are Server Actions. Each one checks its input again with the same zod schema the form
  uses.
- **The cart** is client-side (zustand + `localStorage`). It is only a suggestion: prices, names
  and stock come from the backend when the order is placed.
- **Order status** is polled through `/api/orders/[id]` while the order is `PENDING` (every 1 s for
  5 s, then every 3 s, at most 60 s), because stock is reserved asynchronously over Kafka.
- **Money** is integer minor units everywhere (`src/lib/money.ts`). No floats.

### Layout

```
src/
├── app/
│   ├── (shop)/      home, products, cart, checkout
│   ├── (auth)/      login, register
│   ├── (account)/   profile, addresses, orders
│   ├── admin/       dashboard, products, orders (own layout + role gate)
│   └── api/         health, order polling, cart refresh, debug
├── proxy.ts         auth gate, token refresh, security headers
├── env.ts           zod-validated environment
├── features/        auth, catalog, cart, checkout, orders, account, admin
│                    (components + Server Actions + schemas + tests)
├── lib/             api client, auth, money, formatting
└── components/      layout, forms, shadcn/ui
e2e/                 Playwright tests against the real stack
test/                Vitest setup and helpers
openapi.json         the gateway's spec, source of src/lib/api/schema.d.ts
```

## Run it

Requires Node **24.21.0** (`.nvmrc`) and Docker.

### Local dev server against the compose stack

```sh
# 1. Backend (in ../infra). This also starts the frontend container on :3001,
#    so stop that one to free the port for the dev server.
make up-app
docker compose --env-file .env --profile app stop frontend

# 2. Frontend (in this repo)
cp .env.example .env.local
npm ci
npm run dev                # http://localhost:3001
```

### Fully in compose

```sh
# in ../infra
make up-app                # everything, frontend included → http://localhost:3001
make frontend              # rebuild and restart only the frontend
make logs-frontend
```

### First data

```sh
# sample catalog (product-service)
docker exec ecom-product-service-1 node dist/seed/seed-products.js

# an admin user (user-service)
docker exec -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD=<12+ characters> \
  -e OUTBOX_RELAY_ENABLED=false ecom-user-service node dist/seed/seed-admin.js
```

## Scripts

| Script                                    | What it does                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                             | Dev server on `:3001`                                                                                          |
| `npm run build` / `npm start`             | Production build and server                                                                                    |
| `npm run lint` / `npm run lint:fix`       | ESLint                                                                                                         |
| `npm run format` / `npm run format:check` | Prettier (with Tailwind class sorting)                                                                         |
| `npm run typecheck`                       | Route types + `tsc --noEmit`                                                                                   |
| `npm test` / `npm run test:cov`           | Unit and component tests (Vitest, Testing Library, MSW)                                                        |
| `npm run e2e`                             | Playwright against the running stack                                                                           |
| `npm run gen:api`                         | Fetch the gateway's spec into `openapi.json` and regenerate `schema.d.ts`                                      |
| `npm run gen:api:check`                   | Fail if `schema.d.ts` does not match `openapi.json` (add `-- --live` to also compare with the running gateway) |
| `npm run ci`                              | Everything the CI workflow runs                                                                                |
| `npm run docker:build`                    | Build the image as `ecom-frontend:local`                                                                       |

## Environment

Every variable has a local-dev default. A wrong value stops the build and the boot (`src/env.ts`).

| Variable                      | Default                        | Read at             | Purpose                                                                            |
| ----------------------------- | ------------------------------ | ------------------- | ---------------------------------------------------------------------------------- |
| `API_INTERNAL_URL`            | `http://localhost:3000`        | runtime             | Gateway address as seen by the Next.js server (`http://nginx:80` in compose)       |
| `API_TIMEOUT_MS`              | `8000`                         | runtime             | Timeout per gateway call                                                           |
| `JWT_PUBLIC_KEY_PATH`         | `../infra/keys/jwt-public.pem` | runtime             | RSA public key that verifies access tokens                                         |
| `JWT_ISSUER` / `JWT_AUDIENCE` | `user-service` / `ecom-api`    | runtime             | Must match user-service                                                            |
| `COOKIE_SECURE`               | `false`                        | runtime             | `true` adds `Secure` to the cookies and enables HSTS. Use it behind HTTPS          |
| `IMAGE_HOSTS`                 | _(empty)_                      | **build** + runtime | Hostnames product images may load from (`next/image` allow-list and CSP `img-src`) |
| `NEXT_PUBLIC_SITE_URL`        | `http://localhost:3001`        | **build**           | Public URL, used for canonical links and the sitemap                               |
| `NEXT_PUBLIC_SHOW_DEBUG`      | `false`                        | **build**           | Footer with the last `x-request-id` and gateway instance                           |

## Tests

- **Unit and component** (`npm test`): money maths, cart logic, proxy route matrix, refresh
  single-flight, Server Actions, forms, order polling.
- **End to end** (`npm run e2e`): the real flows against the real stack, including the Kafka order
  flow (order becomes `CONFIRMED`, email arrives in Mailpit), the out-of-stock path
  (`CANCELLED`), the admin flow, session refresh, accessibility (axe, WCAG 2.1 A/AA, light and
  dark) and responsive layout (360 / 768 / 1280 px).

The E2E tests need the stack running, the sample catalog seeded and Docker available (the setup
seeds a test admin with `docker exec` when none can log in). They run with one worker and pace
their logins, because the gateway currently rate-limits all users of the frontend as one client
(GAP-2).

## Known limits

These are backend gaps that are fixed after the frontend (plan §5 and §5a):

- **Rate limiting (GAP-2):** every gateway call comes from the Next.js server, so all users share
  one rate-limit bucket. Not ready for real traffic.
- **Admin product list (GAP-3):** shows active products only. A deactivated product is reached
  with "open by ID".
- **Categories (GAP-5):** the list is in `src/features/catalog/categories.ts`.
- **Seed images (GAP-10):** they point to a host that does not exist, so a placeholder is shown.
- **No idempotency key (GAP-11):** after a network timeout the user is told to check their orders
  before retrying.
- **One instance only (GAP-8):** see "Refresh is single-flight" above.

Other things to know:

- The Content-Security-Policy allows inline scripts (`'unsafe-inline'`). A per-request nonce does
  not work with the prerendered shells of Cache Components (plan v1.2, `FST-9`).
- A product or order page that does not exist shows the not-found page with HTTP status 200,
  because the page shell is already streaming when the lookup finishes.
