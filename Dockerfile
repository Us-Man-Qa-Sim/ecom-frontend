# syntax=docker/dockerfile:1

# ── deps: install exactly what the lockfile says ──
FROM node:26.12.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ── build: `next build` with `output: 'standalone'` ──
FROM node:26.12.0-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# These are read at BUILD time: NEXT_PUBLIC_* is inlined into the browser
# bundle and IMAGE_HOSTS becomes `images.remotePatterns`.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3001
ARG NEXT_PUBLIC_SHOW_DEBUG=false
ARG IMAGE_HOSTS=example.com,cdn.example.com,placehold.co
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SHOW_DEBUG=$NEXT_PUBLIC_SHOW_DEBUG \
    IMAGE_HOSTS=$IMAGE_HOSTS
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The build needs no gateway: catalog pages are rendered at request time.
RUN npm run build

# ── runtime: only the standalone server, as a non-root user ──
FROM node:26.12.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
