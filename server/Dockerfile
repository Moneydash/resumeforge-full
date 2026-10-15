# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# ---- build: full deps + tsc ----
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts skips the puppeteer postinstall (Chrome is only needed in the runtime image)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- prod-deps: production node_modules + Chrome for Puppeteer ----
FROM node:${NODE_VERSION}-bookworm-slim AS prod-deps
WORKDIR /app
# Fixed cache dir so the runtime image finds the Chrome the postinstall script downloads
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev && chmod -R a+rX /opt/puppeteer

# ---- runtime ----
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    PUPPETEER_CACHE_DIR=/opt/puppeteer

# Shared libraries headless Chrome needs, plus fonts for PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates fonts-liberation fonts-noto-color-emoji \
      libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 \
      libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 \
      libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxext6 \
      libxfixes3 libxkbcommon0 libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=prod-deps /opt/puppeteer /opt/puppeteer
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json knexfile.js ./
# Migrations are plain JS and run with `npx knex migrate:latest` (see docker-compose.yml)
COPY --chown=node:node src/db/migrations ./src/db/migrations

# Chrome writes profile/crash data under $HOME; the node user's home is writable
USER node
EXPOSE 8080

# /maintenance/status is public and never touches the database
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/maintenance/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
