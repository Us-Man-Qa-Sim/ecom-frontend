# ecom-frontend

Storefront and admin UI for the ecom microservices backend. Next.js (App Router) · React ·
TypeScript · Tailwind CSS · shadcn/ui.

The browser only talks to this Next.js app. The Next.js server talks to the API gateway through
NGINX and keeps the JWTs in `httpOnly` cookies (BFF pattern). The plan and task list are in
`../FRONTEND_PLAN.md`.

## Run locally

Requires Node 24.21.0 (`.nvmrc`) and the backend stack running:

```sh
# in ../infra
docker compose --profile app up -d

# in this repo
cp .env.example .env.local
npm ci
npm run dev        # http://localhost:3001
```

## Scripts

| Script                            | What it does                                                         |
| --------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                     | Dev server on `:3001`                                                |
| `npm run build` / `npm start`     | Production build and server                                          |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                    |
| `npm run typecheck`               | Route types + `tsc --noEmit`                                         |
| `npm test`                        | Unit and component tests (Vitest)                                    |
| `npm run e2e`                     | Playwright against the running stack                                 |
| `npm run gen:api`                 | Regenerate `src/lib/api/schema.d.ts` from the gateway's `/docs-json` |

## Environment

See `.env.example`. Every variable has a local-dev default. A wrong value fails the build and
the boot (`src/env.ts`).
