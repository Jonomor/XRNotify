# ============================================
# XRNotify Production Dockerfile
# Multi-stage build for minimal runtime image
# ============================================

# -------- Build Stage --------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# -------- Production Stage --------
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S xrnotify && \
    adduser -u 1001 -S xrnotify -G xrnotify

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy only production artifacts
COPY --from=build --chown=xrnotify:xrnotify /app/package*.json ./
COPY --from=build --chown=xrnotify:xrnotify /app/node_modules ./node_modules
COPY --from=build --chown=xrnotify:xrnotify /app/dist ./dist

# Switch to non-root user
USER xrnotify

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/healthz || exit 1

# Default command (overridden in docker-compose for different services)
CMD ["node", "dist/server.js"]

# Expose ports
EXPOSE 8080
