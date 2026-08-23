# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Non-root user for security
RUN addgroup -S naijamart && adduser -S naijamart -G naijamart

# Install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server code and built frontend
COPY server/ ./server/
COPY --from=build /app/dist/ ./dist/

# Create uploads directory (writable by app user)
RUN mkdir -p server/uploads && chown -R naijamart:naijamart /app

USER naijamart

# Expose the API port
EXPOSE 5000

# Environment defaults (override at runtime)
ENV NODE_ENV=production
ENV PORT=5000

# Health check — hits the built-in health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server/index.js"]
