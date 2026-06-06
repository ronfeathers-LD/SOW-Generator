# syntax=docker/dockerfile:1

###############################################
# Stage 1 — install dependencies & build app
###############################################
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# We use the system-installed Chromium at runtime, so skip Puppeteer's
# own ~150MB Chromium download during `npm ci` (see package.json postinstall).
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Build the Next.js app
COPY . .
RUN npm run build

###############################################
# Stage 2 — runtime image
###############################################
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Where our PDF generator looks for Chromium (src/lib/pdf-generator.ts)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium + fonts required for Puppeteer PDF generation
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     chromium \
     fonts-liberation \
     fonts-noto-color-emoji \
     fonts-noto-cjk \
     ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy build output and runtime dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

# Railway injects PORT at runtime; fall back to 3000 for local `docker run`.
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000} -H 0.0.0.0"]
